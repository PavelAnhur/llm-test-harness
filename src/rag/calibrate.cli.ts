import { calibrateRag, printReport } from "./calibrate";

const DATASET_PATH = "tests/fixtures/rag-dataset.json";

calibrateRag(DATASET_PATH)
  .then(printReport)
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
