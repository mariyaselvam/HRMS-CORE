/**
 * Converts a numeric amount to Indian number-words format.
 * e.g. 112412.43 → "One Lakh Twelve Thousand Four Hundred Twelve and Forty-Three Paise Only"
 */
export function numberToWords(amount: number): string {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
        'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
        'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    function twoDigits(n: number): string {
        if (n < 20) return ones[n];
        return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
    }

    function threeDigits(n: number): string {
        if (n >= 100) {
            return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + twoDigits(n % 100) : '');
        }
        return twoDigits(n);
    }

    function convert(n: number): string {
        if (n === 0) return 'Zero';
        let result = '';
        // Crore
        if (n >= 10000000) {
            result += convert(Math.floor(n / 10000000)) + ' Crore ';
            n %= 10000000;
        }
        // Lakh
        if (n >= 100000) {
            result += convert(Math.floor(n / 100000)) + ' Lakh ';
            n %= 100000;
        }
        // Thousand
        if (n >= 1000) {
            result += convert(Math.floor(n / 1000)) + ' Thousand ';
            n %= 1000;
        }
        // Hundred
        if (n > 0) {
            result += threeDigits(n) + ' ';
        }
        return result.trim();
    }

    const rupees = Math.floor(amount);
    const paise  = Math.round((amount - rupees) * 100);

    let words = convert(rupees) + ' Rupees';
    if (paise > 0) {
        words += ' and ' + convert(paise) + ' Paise';
    }
    return words + ' Only';
}

/**
 * Formats a Decimal/number as Indian currency string: e.g. 112412.43 → "1,12,412.43"
 */
export function formatINR(value: number | string | any): string {
    const num = Number(value);
    if (isNaN(num)) return '0.00';
    return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
