import express from 'express'
import { env } from './src/config/env.js'
import cors from 'cors'
import { ApiResponse } from './src/utils/ApiResponse.js'
import authRouter from './src/routes/auth.routes.js'
import { errorHandler } from './src/middlewares/errorHandler.js'

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/v1/auth', authRouter);

app.get('/', (req, res) => {
  res.status(200).json(
    new ApiResponse(200, null, "Server is up and running")
  );
});

// Error handling middleware (must be registered last)
app.use(errorHandler);

const PORT = env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server is listening on port : ${PORT}`)
})