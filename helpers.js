import { BLAZEPOSE_KEYPOINTS_BY_SIDE, ANCHOR_POINTS } from './constants.js'

// Stylizes points colors for multiple polies or poses
export function selectColor(colorNum, totalPoints, colors, pose) {
  if (colors < 1) colors = 1 // avoid divide by zero
  if (colorNum >= totalPoints) return 'white'
  if (colorNum >= colors) return 'black'

  // Color for polygon
  if (!pose) return 'hsl(' + ((colorNum * (360 / colors)) % 360) + ',100%,50%)'

  // highlight key pose points
  if (colorNum === pose.focalPoint) return '#ff0000'
  if (colorNum === pose.alignPoint) return '#C50EFD'
  if (colorNum === pose.rotatePoint) return '#0ECDFD'

  // Color sides of pose
  const keypointInd = BLAZEPOSE_KEYPOINTS_BY_SIDE
  if (colorNum === 0) return '#105E26'
  if (keypointInd.left.indexOf(colorNum) > -1) return '#269900'
  if (keypointInd.right.indexOf(colorNum) > -1) return '#006400'
}

export function simpleTriangle(delta = [1, 1, 1]) {
  const polyPoints = [
    [-0.5, -0.5, -0.5],
    [0.5, 0.5, 0.5],
    [1, 0, 1],
  ]
  polyPoints.forEach((point, i) => {
    polyPoints[i][0] *= delta[0]
    polyPoints[i][1] *= delta[1]
    polyPoints[i][2] *= delta[2]
  })

  const metadata = [
    {
      labelIndex: 0,
      label: polyPoints[0],
    },
    {
      labelIndex: 1,
      label: polyPoints[1],
    },
    {
      labelIndex: 2,
      label: polyPoints[2],
    },
  ]
  const sequences = [
    {
      indices: [0, 1],
    },
    {
      indices: [1, 2],
    },
    {
      indices: [2, 0],
    },
  ]
  return {
    metadata,
    sequences,
    polyPoints,
  }
}

export function generateMeta(polyPoints) {
  const metadata = []
  let sequences = []
  for (let i = 0; i < polyPoints.length; i++) {
    // Add point labels
    metadata.push({
      labelIndex: i,
      label: `X: ${Number(polyPoints[i][0]).toFixed(1)} Y: ${Number(
        polyPoints[i][1]
      ).toFixed(1)} Z: ${Number(polyPoints[i][2]).toFixed(1)}`,
    })

    // Draw a line
    sequences.push({ indices: [i, (i + 1) % polyPoints.length] })
  }

  return { metadata, sequences }
}

export function create3DPolygon(points = 3) {
  // Create *points* number of points 3D space (X, Y, Z)
  const polyPoints = Array.from({ length: points }, () => [
    Math.random(),
    Math.random(),
    Math.random(),
  ])

  const { metadata, sequences } = generateMeta(polyPoints)
  return {
    metadata,
    sequences,
    polyPoints,
  }
}

export function drawMulti(destination, polies, pose = false) {
  // Create scatter graph
  const containerElement = document.getElementById(destination)
  // if it exists grab the existing one
  const scatterGL = window[destination].sequences
    ? window[destination]
    : new ScatterGL(containerElement)

  let pointSize = 0
  let totalSequence = []
  let dataset = []
  let pointsMeta = []
  polies.forEach((polygon) => {
    const { polyPoints, sequences } = polygon
    const { metadata } = generateMeta(polyPoints) // Regenerate meta for changes
    dataset = [...dataset, ...polyPoints]
    const bumpedSequences = sequences.map((sequence) => {
      const bumped = sequence.indices.map((index) => index + pointSize)
      return { indices: bumped }
    })
    const metaMiddle = metadata.map((meta, i) => ({
      labelIndex: pointSize,
      label: meta.label,
    }))
    pointSize += polyPoints.length
    pointsMeta = [...pointsMeta, ...metaMiddle]
    totalSequence = [...totalSequence, ...bumpedSequences]
  })

  const glDataset = new ScatterGL.Dataset(
    [...dataset, ...ANCHOR_POINTS],
    pointsMeta
  )

  // Add data to scatter graph + lines
  if (window[destination].sequences) {
    scatterGL.updateDataset(glDataset, totalSequence)
  } else {
    scatterGL.render(glDataset)
    scatterGL.setSequences(totalSequence)
  }

  scatterGL.setPointColorer((index) =>
    selectColor(index, pointSize, polies[0].polyPoints.length, pose)
  )
  scatterGL.scatterPlot.setPolylineOpacities(new Array(pointSize).fill(1))

  // store on Global for debug accessibility
  window[destination] = scatterGL
  // console.log({ destination, pointSize, totalSequence, dataset })
}

export function moveFocalPointToOrigin(polygon, focalPointIndex) {
  const focalPoint = polygon.polyPoints[focalPointIndex]
  // This is a non-tensor translation to origin
  // A vector's linear translation to origin would be
  // https://bit.ly/3DQbNbZ
  polygon.polyPoints.map((point, idx) => {
    polygon.polyPoints[idx] = point.map((v, i) => v - focalPoint[i])
  })
  return polygon
}

export function matrixRotate(axis, polygon, angle) {
  // in radians
  const theta = tf.scalar(angle)
  // TODO: Try to keep these as scalars to keep in GPU
  const tc = theta.cos().arraySync()
  const ts = theta.sin().arraySync()
  // https://en.wikipedia.org/wiki/Rotation_matrix#Basic_rotations
  // https://robotics.stackexchange.com/questions/10702/rotation-matrix-sign-convention-confusion
  let rotateMatrix // Not the normal right-hand rule version
  if (axis === 'x') {
    rotateMatrix = tf.tensor([
      [1, 0, 0],
      [0, tc, -ts],
      [0, ts, tc],
    ])
  } else if (axis === 'y') {
    rotateMatrix = tf.tensor([
      [tc, 0, ts],
      [0, 1, 0],
      [-ts, 0, tc],
    ])
  } else if (axis === 'z') {
    rotateMatrix = tf.tensor([
      [tc, ts, 0],
      [-ts, tc, 0],
      [0, 0, 1],
    ])
  }

  // TODO: Multiple multiplications, just do one matrix mul for speed
  polygon.polyPoints.map((startPoint, startPointIndex) => {
    const tensorAlign = tf.tensor(startPoint).reshape([3, 1])
    const rotatedPoint = tf.matMul(rotateMatrix, tensorAlign)
    const movedPoint = rotatedPoint.arraySync()
    polygon.polyPoints[startPointIndex] = movedPoint
  })

  return polygon
}

export function rotateToAlign(polygon, alignPointIndex) {
  // Rotate Z to X axis
  let alignPoint = polygon.polyPoints[alignPointIndex]
  const xang = Math.atan2(alignPoint[1], alignPoint[0])
  polygon = matrixRotate('z', polygon, xang)
  // Rotate Y to X axis
  alignPoint = polygon.polyPoints[alignPointIndex]
  const zang = Math.atan2(alignPoint[2], alignPoint[0])
  return matrixRotate('y', polygon, zang)
}

export function rotateToGoal(polygon, goalPolygon, rotateIndex) {
  const rotatePoint = polygon.polyPoints[rotateIndex]
  const goalRotatePoint = goalPolygon.polyPoints[rotateIndex]

  const myang = Math.atan2(rotatePoint[2], rotatePoint[1])
  const byang = Math.atan2(goalRotatePoint[2], goalRotatePoint[1])
  const yang = byang - myang
  return matrixRotate('x', polygon, yang)
}

export function nudge(poly, x, y, z) {
  return poly.map((coords) => [coords[0] + x, coords[1] + y, coords[2] + z])
}
