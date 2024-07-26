'use client'

import Konva from 'konva'
import { KonvaEventObject } from 'konva/lib/Node'
import { Box } from 'konva/lib/shapes/Transformer'
import { KonvaNodeEvent } from 'konva/lib/types'
import React, { ReactElement, ReactNode, useEffect, useRef, useState } from 'react'
import { Layer, Rect, Stage, Transformer } from 'react-konva'

interface ReactElementProps {
  children: ReactNode
}

interface RoomElementProps {
  shapeProps: ShapeConfig
  isSelected: boolean
  floorRef?: React.MutableRefObject<Konva.Rect | null>
  onSelect?: () => void
  onChange?: (shapeProps: ShapeConfig) => void
  onDragMove?: (ev: KonvaEventObject<DragEvent>) => void
}

type ShapeConfig = 
  Konva.ShapeConfig &
  Required<Pick<Konva.ShapeConfig, 'id' | 'width' | 'height' | 'x' | 'y'>>

const PageContainer = ({children}: ReactElementProps): ReactElement => (
  <div
    className='page-container'
    style={{
      display: 'flex',
      flexDirection: 'row',
      width: '100%',
      height: '100vh',
      maxHeight: '100vh'
    }}
  >
    {children}
  </div>
)

const Sidebar = ({children}: ReactElementProps): ReactElement => (
  <div
    className='sidebar'
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      width: '20%',
      background: 'black',
      color: 'white',
      paddingBlockStart: 20,
      gap: 20
    }}
  >
    {children}
  </div>
)

const DrawingArea = ({children}: ReactElementProps): ReactElement => (
  <div
    className='drawing-area'
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'white',
      color: 'black',
      width: '100%'
    }}
  >
    {children}
  </div>
)

const hasSeparatingAxis = (corners1: Konva.Vector2d[], corners2: Konva.Vector2d[]) => {
  const axes = [
    {x: corners1[1].x - corners1[0].x, y: corners1[1].y - corners1[0].y},
    {x: corners1[2].x - corners1[1].x, y: corners1[2].y - corners1[1].y},
    {x: corners2[1].x - corners2[0].x, y: corners2[1].y - corners2[0].y},
    {x: corners2[2].x - corners2[1].x, y: corners2[2].y - corners2[1].y},
  ];

  for (const axis of axes) {
    const projections1 = corners1.map(corner => corner.x * axis.x + corner.y * axis.y);
    const projections2 = corners2.map(corner => corner.x * axis.x + corner.y * axis.y);

    const min1 = Math.min(...projections1);
    const max1 = Math.max(...projections1);
    const min2 = Math.min(...projections2);
    const max2 = Math.max(...projections2);

    if (max1 < min2 || max2 < min1) {
      return true;
    }
  }

  return false;
}

const areColliding = (shape1: ShapeConfig, shape2: ShapeConfig) => {
  const corners1 = [
    {x: shape1.x, y: shape1.y},
    {x: shape1.x + shape1.width, y: shape1.y},
    {x: shape1.x + shape1.width, y: shape1.y + shape1.height},
    {x: shape1.x, y: shape1.y + shape1.height}
  ];

  const corners2 = [
    {x: shape2.x, y: shape2.y},
    {x: shape2.x + shape2.width, y: shape2.y},
    {x: shape2.x + shape2.width, y: shape2.y + shape2.height},
    {x: shape2.x, y: shape2.y + shape2.height}
  ];

  const theta1 = ((shape1.rotation ?? 0) * Math.PI) / 180;
  const theta2 = ((shape2.rotation ?? 0) * Math.PI) / 180;

  const rotatedCorners1 = corners1.map(corner => {
    const cx = corner.x + shape1.width / 2;
    const cy = corner.y + shape1.height / 2;

    return {
      x: cx + (corner.x - cx) * Math.cos(theta1) - (corner.y - cy) * Math.sin(theta1),
      y: cy + (corner.x - cx) * Math.sin(theta1) + (corner.y - cy) * Math.cos(theta1)
    }
  });

  const rotatedCorners2 = corners2.map(corner => {
    const cx = corner.x + shape2.width / 2;
    const cy = corner.y + shape2.height / 2;

    return {
      x: cx + (corner.x - cx) * Math.cos(theta2) - (corner.y - cy) * Math.sin(theta2),
      y: cy + (corner.x - cx) * Math.sin(theta2) + (corner.y - cy) * Math.cos(theta2)
    }
  });

  console.log(rotatedCorners1)
  console.log(rotatedCorners2)

  const colliding = !hasSeparatingAxis(rotatedCorners1, rotatedCorners2)

  console.log(colliding)

  return colliding
}

const RoomElement = ({
  shapeProps,
  isSelected,
  floorRef,
  onSelect,
  onDragMove,
}: RoomElementProps): ReactElement => {
  const [nbound, setNbound] = useState<number>(0)
  const [ebound, setEbound] = useState<number>(0)
  const [sbound, setSbound] = useState<number>(0)
  const [wbound, setWbound] = useState<number>(0)
  const [isTransforming, setIsTransforming] = useState<boolean>(false)
  const [boundingBox, setBoundingBox] = useState<Omit<ShapeConfig, 'id'> | null>(null)

  const shapeRef = useRef<Konva.Rect | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);

  useEffect(() => {
    if (shapeRef.current) {
      setBoundingBox(shapeRef.current.getClientRect())
    }
  }, [shapeRef])

  useEffect(() => {
    const floor = floorRef?.current

    if (floor) {
      const floorBox = floor.getClientRect()
      const strokeWidth = floor.strokeWidth()

      setNbound(floorBox.y + strokeWidth)
      setEbound(floorBox.x + floorBox.width - strokeWidth)
      setSbound(floorBox.y + floorBox.height - strokeWidth)
      setWbound(floorBox.x + strokeWidth)
    }
  }, [floorRef])

  useEffect(() => {
    const currentShape = shapeRef.current
    const currentTransformer = transformerRef.current

    if (currentShape && currentTransformer && isSelected) {
      currentTransformer.nodes([currentShape])
      currentTransformer.getLayer()?.batchDraw()
    }
  }, [isSelected])

  const dragBoundFunction = (pos: Konva.Vector2d) => {
    if (isTransforming) return pos

    const floor = floorRef?.current
    const shape = shapeRef?.current

    if (floor && shape && boundingBox && !isTransforming) {
      let newX = pos.x
      let newY = pos.y
  
      if (boundingBox.y <= nbound) return pos
      if (boundingBox.x + boundingBox.width >= ebound) return pos
      if (boundingBox.y + boundingBox.height >= sbound) return pos
      if (boundingBox.x <= wbound) return pos

      return {x: newX, y: newY}
    }
  
    return pos     
  }

  const boundBoxFunction = (oldBox: Box, newBox: Box) => {
    if (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5) return oldBox

    const floor = floorRef?.current
    const shape = shapeRef?.current
    const maxWidth = floor ? floor.width() - floor.strokeWidth() : 0
    const maxHeigth = floor ? floor.height() - floor.strokeWidth() : 0

    if (floor && shape) {
      if (newBox.y <= nbound) { newBox.y = oldBox.y; newBox.height = oldBox.height}
      if (newBox.x + newBox.width >= ebound) { newBox.width = oldBox.width }
      if (newBox.y + newBox.height >= sbound) { newBox.height = oldBox.height }
      if (newBox.x <= wbound) {newBox.x = oldBox.x; newBox.width = oldBox.width}
      if (newBox.width > maxWidth) { newBox.width = maxWidth }
      if (newBox.height > maxHeigth) { newBox.height = maxHeigth }
    }

    return newBox
  }

  const handleDragMove = (ev) => {
    onDragMove && onDragMove(ev)

    const shape = shapeRef.current

    if (shape) {
      setBoundingBox(shape.getClientRect())
    }
  }

  const handleTransformStart = () => {setIsTransforming(true), shapeRef.current?.stopDrag()}

  const handleTransformEnd = () => setIsTransforming(false)

  const handleTransform = () => {
    const shape = shapeRef.current

    if (shape) {
      shape.setAttrs({
        width: Math.max(shape.width() * shape.scaleX(), 5),
        height: Math.max(shape.height() * shape.scaleY(), 5),
        scaleX: 1,
        scaleY: 1,
      })

      setBoundingBox(shape.getClientRect())
    }
  }

  return (
    <>      
      <Rect
        x={boundingBox?.x}
        y={boundingBox?.y}
        width={boundingBox?.width}
        height={boundingBox?.height}
        stroke='red'
        dashEnabled={true}
        draggable={false}
      />
      <Rect
        {...shapeProps}
        ref={shapeRef}
        onClick={onSelect}
        onTap={onSelect}
        onTransformStart={handleTransformStart}
        onTransform={handleTransform}
        onTransformEnd={handleTransformEnd}
        dragBoundFunc={dragBoundFunction}
        onDragMove={handleDragMove}
        draggable
      />
      {isSelected && (
        <Transformer
          ref={transformerRef}
          flipEnabled={false}
          ignoreStroke={true}
          boundBoxFunc={boundBoxFunction}
        />
      )}
    </>
  )
}

const Page = (): ReactElement => {
  const [shapes, setShapes] = useState<ShapeConfig[]>([])
  const [floor, setFloor] = useState<ShapeConfig | null>(null)
  const [selectedShape, setSelectedShape] = React.useState<string | null>(null)

  const stageWidth = window.innerWidth * 0.8
  const stageHeight = window.innerHeight
  const floorSize = stageWidth * 0.5
  const rectangleSize = stageWidth * 0.1

  const stageRef = useRef<Konva.Stage | null>(null)
  const floorRef = useRef<Konva.Rect | null>(null)

  const deselectAll = (e: any) => {
    const clickedOnEmpty = e.target === e.target?.getStage() || e.target.attrs.id === '0'

    if (clickedOnEmpty) {
      setSelectedShape(null)
    }
  }

  const addRectangle = () => {
    const newRectangleConfig: ShapeConfig = {
      name: 'rectangle',
      id: `${shapes.map(shape => +shape.id).reduce((a, b) => Math.max(a, b), -Infinity) + 1}`,
      x: (stageWidth / 2) - (rectangleSize / 2),
      y: (stageHeight / 2) - (rectangleSize / 2),
      width: rectangleSize,
      height: rectangleSize,
      stroke: 'black',
      strokeScaleEnabled: false,
      draggable: true,
    }

    setShapes([...shapes, newRectangleConfig])
  }

  useEffect(() => {
    const floorConfig = {
      id: '0', 
      x: (stageWidth / 2) - (floorSize / 2),
      y: (stageHeight / 2) - (floorSize / 2),
      width: floorSize,
      height: floorSize,
      stroke: 'blue'
    }

    setFloor(floorConfig)
  }, [])

  
  // useEffect(() => {
  //   if (!shapeWasMoved) return

  //   shapes.forEach((shape) => {
  //     shapes.forEach((otherShape) => {
  //       if ((shape !== otherShape) && areColliding(shape, otherShape)) {
  //         console.log("Bam")
  //       }
  //     })
  //   })

  //   console.log("Shape was moved")

  //   setShapeWasMoved(false)
  // }, [shapeWasMoved])

  return (
    <PageContainer>
      <Sidebar>
        <h1>Sidebar</h1>
        <button onClick={addRectangle}>Add Rectangle</button>
      </Sidebar>    
      <DrawingArea>
        <Stage
          ref={stageRef}
          width={stageWidth}
          height={stageHeight}
          onMouseDown={deselectAll}
          onTouchStart={deselectAll}
        >
          <Layer>
            <Rect
              {...floor}
              ref={floorRef}
              onMouseDown={deselectAll}
              onTouchStart={deselectAll}
            />
            {shapes.map((shape, index) => (
              <RoomElement
                key={index}
                shapeProps={shape}
                floorRef={floorRef}
                isSelected={shape.id === selectedShape}
                onSelect={() => {setSelectedShape(shape.id)}}
                onDragMove={(ev: Konva.KonvaEventObject<DragEvent>) => {
                  const shapes = ev.target.getLayer()?.children.filter((child) => child.name() === 'rectangle' && child.getClassName() === 'Rect')
                  
                  console.log(shapes)

                  if (shapes !== undefined && shapes?.length > 1) {
                    shapes.forEach((otherShape) => {
                      if (shape !== otherShape && areColliding(shape, otherShape)) {
                        console.log('Bam')
                        ev.target.setAttrs({fill: 'red'})
                      }
                    })
                  }

                }}
              />
            ))}
          </Layer>
        </Stage>
      </DrawingArea>
    </PageContainer>
  )
}

export default Page
