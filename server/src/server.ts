import 'dotenv/config';
import { env } from './config/env';
import app from './app';

app.listen(env.PORT, () => {
  console.log(`Query Advisor Server running on port ${env.PORT}`);
});
