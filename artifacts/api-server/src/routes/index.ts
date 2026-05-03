import { Router, type IRouter } from "express";
import healthRouter from "./health";
import casesRouter from "./cases";
import exceptionsRouter from "./exceptions";
import actionsRouter from "./actions";
import jobsRouter from "./jobs";
import mockRouter from "./mock";
import metricsRouter from "./metrics";

const router: IRouter = Router();

router.use(healthRouter);
router.use(casesRouter);
router.use(exceptionsRouter);
router.use(actionsRouter);
router.use(jobsRouter);
router.use(mockRouter);
router.use(metricsRouter);

export default router;
