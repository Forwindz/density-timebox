import {maxDistance} from "./distance";


export function kmeans(data, k, allFlag, ids, disFunction = maxDistance) {

  const disMatrix = disFunction(data);
  const sumDist = new Array(data.length).fill(0).map((_, i) => {
    let sum = 0;
    for (let j = 0; j < data.length; j++)
      sum += disMatrix[i][j];
    return sum;
  });

  var assignment = new Array(data.length);
  // var clusters = new Array(k).fill(undefined).map((_, i) => [minSumDist[i][1]]);
  var clusters = new Array(k).fill(undefined).map((_, i) => [i, data.length - i - 1]);
  // console.log(clusters, disMatrix);


  // console.log(disMatrix[0]);

  function dist2Cluster(x, c) {
    let sum = 0;
    for (let i = 0; i < clusters[c].length; i++) {
      sum += disMatrix[x][clusters[c][i]];
      // console.log(x, clusters[c][i], disMatrix[x], disMatrix[x][clusters[c][i]]);
    }
    return clusters[c].length ? sum / clusters[c].length : Infinity;
  }
  function classify(x) {
    let assigned = null, min = 0;
    for (let i = 0; i < k; i++) {
      const dis = dist2Cluster(x, i);
      // console.log(x, i, clusters[i], dis);
      if (assigned === null || min > dis) {
        assigned = i;
        min = dis;
      }
    }
    return assigned;
  }

  var iterations = 20;
  var movement = true;

  while (movement && iterations > 0) {
    iterations --;
    // update point-to-centroid assignments
    for (var i = 0; i < data.length; i++) {
      assignment[i] = classify(i);
      // console.log(assignment[i]);
      // assignment[i] = this.classify(points[i], distance);
    }

    // clusters = new Array(k).fill(undefined).map(() =>[]);
    // for (let i = 0; i < data.length; i++) {
    //   clusters[assignment[i]].push(i);
    // }

    // update location of each centroid
    movement = false;
    for (var j = 0; j < k && !movement; j++) {
      var assigned = [];
      for (var i = 0; i < assignment.length; i++) {
        if (assignment[i] === j) {
          // assigned.push(points[i]);
          assigned.push(i);
        }
      }

      if (assigned.length !== clusters[j].length) {
        movement = true;
      }
      else {
        for (let i = 0; i < assigned.length; i++) {
          if (assigned[i] !== clusters[j][i])
            movement = true;
        }
      }

      clusters[j] = assigned;

      // if (!assigned.length) {
      //   continue;
      // }

      // var centroid = this.centroids[j];
      // var newCentroid = new Array(centroid.length);

      // for (var g = 0; g < centroid.length; g++) {
      //   var sum = 0;
      //   for (var i = 0; i < assigned.length; i++) {
      //     sum += assigned[i][g];
      //   }
      //   newCentroid[g] = sum / assigned.length;
      //
      //   if (newCentroid[g] != centroid[g]) {
      //     movement = true;
      //   }
      // }

      // this.centroids[j] = newCentroid;
      // clusters[j] = assigned;
    }
  }
  console.log(clusters, k, iterations);
  // clusters.forEach(cluster => {
  //   cluster.sort((a, b) => sumDist[a] - sumDist[b]);
  // });
  if (allFlag)
    return ids ? clusters.map(cluster => cluster.map(d => ids[d])) : clusters;
  else
    return ids ? clusters.map(d => ids[d[0]]) : clusters.map(d => d[0]);
    // return clusters.map(d => ids[d[0]]);
}
