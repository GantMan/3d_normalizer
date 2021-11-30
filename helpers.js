import {
  BLAZEPOSE_KEYPOINTS_BY_SIDE,
  BLAZEPOSE_CONNECTED_KEYPOINTS_PAIRS,
} from './constants.js'

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
  if (colorNum === 0) return 'yellow'
  if (keypointInd.left.indexOf(colorNum) > -1) return '#07830F'
  if (keypointInd.right.indexOf(colorNum) > -1) return '#ff8c00'
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
