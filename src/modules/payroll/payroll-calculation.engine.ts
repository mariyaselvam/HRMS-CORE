export interface ComponentInput {
    id: string;
    code: string;
    name: string;
    type: 'earning' | 'deduction';
    calcType: string;
    calcValue: number;
    formula?: string;
    pfApplicable: boolean;
    esiApplicable: boolean;
    calculationOrder: number;
}

export interface CalculatedComponent {
    code: string;
    name: string;
    type: 'earning' | 'deduction';
    value: number;
}

export class PayrollCalculationEngine {
    /**
     * Calculates the breakdown of salary components based on CTC and template rules
     * @param monthlyCTC Total monthly cost to company (CTC)
     * @param items Mapped template components with overrides and calculation order
     */
    static calculate(monthlyCTC: number, items: ComponentInput[]): {
        breakdown: CalculatedComponent[];
        grossSalary: number;
        totalDeductions: number;
        netSalary: number;
    } {
        // Sort items by calculation order
        const sortedItems = [...items].sort((a, b) => a.calculationOrder - b.calculationOrder);
        const results: Map<string, number> = new Map();
        const breakdown: CalculatedComponent[] = [];

        let basicValue = 0;
        let grossEarnings = 0;
        let totalDeductions = 0;

        // First pass: Calculate all standard earnings (non-remaining)
        for (const item of sortedItems) {
            if (item.type === 'earning' && item.calcType !== 'remaining') {
                let val = 0;
                const pct = item.calcValue / 100;

                switch (item.calcType) {
                    case 'fixed':
                        val = item.calcValue;
                        break;
                    case 'pct_ctc':
                        val = monthlyCTC * pct;
                        break;
                    case 'pct_basic':
                        val = basicValue * pct;
                        break;
                    case 'manual':
                        val = item.calcValue || 0;
                        break;
                    default:
                        val = 0;
                }

                val = Math.round(val);
                results.set(item.code, val);

                if (item.code === 'BASIC') {
                    basicValue = val;
                }

                grossEarnings += val;
                breakdown.push({
                    code: item.code,
                    name: item.name,
                    type: 'earning',
                    value: val
                });
            }
        }

        // Second pass: Calculate "remaining" earning component (e.g. Special Allowance)
        for (const item of sortedItems) {
            if (item.type === 'earning' && item.calcType === 'remaining') {
                const val = Math.max(0, monthlyCTC - grossEarnings);
                results.set(item.code, val);
                grossEarnings += val;
                breakdown.push({
                    code: item.code,
                    name: item.name,
                    type: 'earning',
                    value: val
                });
            }
        }

        // Third pass: Calculate deductions (which can depend on Basic or Gross)
        for (const item of sortedItems) {
            if (item.type === 'deduction') {
                let val = 0;
                const pct = item.calcValue / 100;

                // Handle special statutory deduction rules
                if (item.code === 'PF') {
                    // EPF: 12% of Basic, capping Basic base at 15000
                    const pfBase = Math.min(basicValue, 15000);
                    val = pfBase * 0.12;
                } else if (item.code === 'ESI') {
                    // ESI: 0.75% of Gross if Gross <= 21000
                    if (grossEarnings <= 21000) {
                        val = grossEarnings * 0.0075;
                    } else {
                        val = 0;
                    }
                } else {
                    switch (item.calcType) {
                        case 'fixed':
                            val = item.calcValue;
                            break;
                        case 'pct_basic':
                            val = basicValue * pct;
                            break;
                        case 'pct_gross':
                            val = grossEarnings * pct;
                            break;
                        default:
                            val = 0;
                    }
                }

                val = Math.round(val);
                results.set(item.code, val);
                totalDeductions += val;

                breakdown.push({
                    code: item.code,
                    name: item.name,
                    type: 'deduction',
                    value: val
                });
            }
        }

        return {
            breakdown,
            grossSalary: grossEarnings,
            totalDeductions,
            netSalary: Math.max(0, grossEarnings - totalDeductions)
        };
    }
}
