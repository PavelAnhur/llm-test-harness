import { calibrateJudge, printReport } from "./calibrate";

const DATASET_PATH = "tests/fixtures/helpfulness-dataset.json";

calibrateJudge(DATASET_PATH)
  .then(printReport)
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
