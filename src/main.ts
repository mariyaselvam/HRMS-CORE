import 'dotenv/config';
import app from './app';
import { PORT } from './config/env';

const start = () => {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
};

start();
