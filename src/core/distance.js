// all data format: {x:number, y:number}[][]
import {
  point_line_distance_multi,
  point_line_distance,
} from "line-distance-calculator";

export function maxDistance(data) {
  const distance = new Array(data.length)
    .fill(0)
    .map(() => new Float32Array(data.length));
  for (let i = 0; i < distance.length; i++) {
    for (let j = 0; j < i; j++) {
      let max = 0;
      for (let m = 0; m < data[i].length - 1; m++) {
        for (let n = 0; n < data[j].length; n++) {
          const dis = point_line_distance(
            data[j][n],
            data[i][m],
            data[i][m + 1]
          );
          max = Math.max(dis, max);
        }
      }
      distance[i][j] = max;
      distance[j][i] = max;
    }
  }
  return distance;
}

export function minDistance(data) {
  const distance = new Array(data.length)
    .fill(0)
    .map(() => new Float32Array(data.length));
  for (let i = 0; i < distance.length; i++) {
    for (let j = 0; j < i; j++) {
      let min = Infinity;
      for (let k = 0; k < data[j].length; k++) {
        if (data[i].length >= 2) {
          const dis = point_line_distance_multi(data[j][k], data[i]);
          min = Math.min(min, dis[1]);
        }
      }
      distance[i][j] = min;
      distance[j][i] = min;
    }
  }
  return distance;
}

export function hausdorffDistance(data) {
  const distance = new Array(data.length)
    .fill(0)
    .map(() => new Float32Array(data.length));
  for (let i = 0; i < distance.length; i++) {
    for (let j = 0; j < distance.length; j++) {
      let maxmin = 0;
      for (let k = 0; k < data[i].length; k++) {
        if (data[j].length >= 2) {
          const dis = point_line_distance_multi(data[i][k], data[j]);
          maxmin = Math.max(maxmin, dis[1]);
        }
      }
      distance[i][j] = maxmin;
    }
  }
  return distance;
}

export function sumDistance(data) {
  const distance = new Array(data.length)
    .fill(0)
    .map(() => new Float32Array(data.length));
  for (let i = 0; i < distance.length; i++) {
    for (let j = 0; j < i; j++) {
      let sum = 0;
      for (let m = 0; m < data[i].length - 1; m++) {
        for (let n = 0; n < data[j].length; n++) {
          const dis = point_line_distance(
            data[j][n],
            data[i][m],
            data[i][m + 1]
          );
          sum += dis;
        }
      }
      distance[i][j] = sum;
      distance[j][i] = sum;
    }
  }
  return distance;
}

export function averageDistance(data) {
  const distance = new Array(data.length)
    .fill(0)
    .map(() => new Float32Array(data.length));
  for (let i = 0; i < distance.length; i++) {
    for (let j = 0; j < i; j++) {
      let sum = 0;
      for (let m = 0; m < data[i].length - 1; m++) {
        for (let n = 0; n < data[j].length; n++) {
          const dis = point_line_distance(
            data[j][n],
            data[i][m],
            data[i][m + 1]
          );
          sum += dis;
        }
      }
      distance[i][j] = sum / data[i].length;
      distance[j][i] = sum / data[j].length;
    }
  }
  return distance;
}
