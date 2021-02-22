
import { cpus } from "os";
import { Worker } from "worker_threads";

const maxWorkers = process.env.WORKERS_LIMIT
  ? parseInt(process.env.WORKERS_LIMIT)
  : 999;
const numberOfWorkers = Math.min(maxWorkers, Math.ceil(cpus().length / 2));

function spawnWorker() {
    return new Worker(`___WORKER___PLACEHOLDER___`, { eval: true });
  }

function createWorkers() {
  const workers = [];

  for (let i = 0; i < numberOfWorkers; i++) {
    const worker = spawnWorker();
    workers.push(worker);
  }
  return workers;
}

export async function copyFiles(fileActions: { src: string; dest: string }[]) {
  const workers = createWorkers();
  await new Promise<void>((resolve, reject) => {
    const split = fileActions
      .reduce<{ src: string; dest: string }[][]>(
        (acc, curr) => {
          if (
            acc[acc.length - 1].length <
            Math.ceil(fileActions.length / numberOfWorkers)
          ) {
            acc[acc.length - 1].push(curr);
          } else {
            acc.push([curr]);
          }
          return acc;
        },
        [[]]
      )
      .filter((ac) => ac && ac.length);

    if (!split.length) {
      resolve();
    }

    let running = 0;
    split.forEach((ac, i) => {
      const worker = workers[i];
      const onError = (err: any) => {
        worker.off("error", onError);
        worker.off("close", onError);
        worker.off("message", onMessage);
        reject(err && err.err);
      };
      const onMessage = () => {
        running -= 1;
        if (running === 0) {
          resolve();
        }
        worker.off("error", onError);
        worker.off("close", onError);
        worker.off("message", onMessage);
      };
      worker.on("error", onError);
      worker.on("close", onError);
      worker.on("message", onMessage);
      const actions = ac.map((action) => ({
        src: action.src,
        dest: action.dest,
      }));

      running++;
      worker.postMessage({ actions });
    });
  }).finally(() => workers.forEach((w) => w.terminate()));
}