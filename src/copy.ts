import { parentPort } from "worker_threads";
import * as fs from "fs";

const queue: { actions: { src: string; dest: string }[] }[] = [];
let active = false;

parentPort &&
  parentPort.on(
    "message",
    (o: { actions: { src: string; dest: string }[] }) => {
      if (active) {
        queue.push(o);
      } else {
        active = true;
        processQueue(o);
      }
    }
  );

function processQueue(o: { actions: { src: string; dest: string }[] }) {
  try {
    let running = o.actions.length;

    // Safety short circuit in case we somehow start a worker with nothing.
    if (running === 0) {
      parentPort && parentPort.postMessage("");
      if (queue.length === 0) {
        active = false;
      } else {
        const next = queue.pop()!;
        processQueue(next);
      }
    }

    o.actions.forEach((a) => {
      fs.copyFile(a.src, a.dest, 0, (err) => {
        if (err) {
          parentPort && parentPort.emit("error", err);
        } else {
          running -= 1;
          if (running === 0) {
            parentPort && parentPort.postMessage("");
            if (queue.length === 0) {
              active = false;
            } else {
              const next = queue.pop()!;
              processQueue(next);
            }
          }
        }
      });
    });
  } catch (e) {
    parentPort && parentPort.emit("error", e);
  }
}
