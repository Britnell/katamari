import { Partition, Note } from "musiquejs";

const audioContext = new AudioContext();

export function bloop() {
  const partition = new Partition(
    [new Note("E", 3, 0.18), new Note("E", 4, 0.36)],
    "square",
    audioContext
  );

  partition.play();
}

export const boop = () => {
  const partition = new Partition(
    [new Note("D", 2, 0.2)],
    "square",
    audioContext
  );

  partition.play();
};
