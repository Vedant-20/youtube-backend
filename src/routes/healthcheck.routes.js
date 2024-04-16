import { Router } from 'express';
import { HealthCheck } from '../controllers/healthcheck.controller.js';

const router=new Router()

router.route('/activeserver').get(HealthCheck)

export default router