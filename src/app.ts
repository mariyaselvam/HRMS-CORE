import express from 'express';

const app = express();

app.use(express.json());

// Routes
// import routes from './routes';
// app.use('/api', routes);

export default app;
