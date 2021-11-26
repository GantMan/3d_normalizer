export function selectColor(colorNum, totalPoints, colors) {
  if (colors < 1) colors = 1 // avoid divide by zero
  if (colorNum >= totalPoints) return 'white'
  if (colorNum >= colors) return 'black'
  return 'hsl(' + ((colorNum * (360 / colors)) % 360) + ',100%,50%)'
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
  const sequences = []
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
