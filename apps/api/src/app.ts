import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';

import { errorHandler } from './middleware/error';
import { authRouter } from './domains/auth/router';
import { usersRouter } from './domains/users/router';
import { partnersRouter } from './domains/partners/router';
import { doctorsRouter } from './domains/doctors/router';
import { appointmentsRouter } from './domains/appointments/router';
import { prescriptionsRouter } from './domains/prescriptions/router';
import { ordersRouter } from './domains/orders/router';
import { deliveriesRouter } from './domains/deliveries/router';
import { paymentsRouter } from './domains/payments/router';
import { pricingRouter } from './domains/pricing/router';
import { ridesRouter } from './domains/rides/router';
import { mealsRouter } from './domains/meals/router';
import { chatRouter } from './domains/chat/router';
import { adminRouter } from './domains/admin/router';

export const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Fichiers uploadés (scans d'ordonnances) — en prod, remplacer par S3
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/auth', authRouter);
app.use('/users', usersRouter);
app.use('/partners', partnersRouter);
app.use('/doctors', doctorsRouter);
app.use('/appointments', appointmentsRouter);
app.use('/prescriptions', prescriptionsRouter);
app.use('/orders', ordersRouter);
app.use('/deliveries', deliveriesRouter);
app.use('/payments', paymentsRouter);
app.use('/pricing', pricingRouter);
app.use('/rides', ridesRouter);
app.use('/meals', mealsRouter);
app.use('/chat', chatRouter);
app.use('/admin', adminRouter);

app.use(errorHandler);
