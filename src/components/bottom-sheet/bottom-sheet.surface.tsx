// The parts of the Bottom sheet in the sheet: the handle, the header, the content, and the footer
// (contract: ir/contracts/bottom-sheet.json). The modal sheet and the persistent sheet share them.
import type { FocusEvent, KeyboardEvent, MouseEvent, PointerEvent, ReactNode, Ref, WheelEvent } from 'react'
import type { DragSource } from './bottom-sheet.drag'
import {
  sheetContent,
  sheetCount,
  sheetFooter,
  sheetHandle,
  sheetHandleRow,
  sheetHeader,
  sheetHeaderDrag,
  sheetTitleGroup,
} from './bottom-sheet.variants'
import { cx } from '@monorithm/react/lib/cx'

export interface SheetSurfaceProps {
  layout: 'bottom' | 'side'
  /** The title element: Dialog.Title for a modal sheet, a heading for a persistent sheet. */
  title: ReactNode
  count?: ReactNode
  /** The close button of a modal sheet. */
  close?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  handleLabel: string
  contentRef: Ref<HTMLDivElement>
  innerRef: Ref<HTMLDivElement>
  onPointerDown: (event: PointerEvent<HTMLElement>, source: DragSource) => void
  /** Stops the click after a drag. */
  onClickCapture: (event: MouseEvent<HTMLElement>) => void
  onHandleClick: () => void
  onHandleKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void
}

export function SheetSurface(props: SheetSurfaceProps) {
  const bottom = props.layout === 'bottom'
  const drag = bottom ? (event: PointerEvent<HTMLElement>) => props.onPointerDown(event, 'drag-area') : undefined
  return (
    <>
      {/* bottom-sheet/side-sheet: a side sheet has no handle. */}
      {bottom ? (
        <div data-part="handle-row" className={sheetHandleRow} onPointerDown={drag} onClickCapture={props.onClickCapture}>
          {/* bottom-sheet/handle-role: a button with the name "Resize the sheet", in the focus order of the sheet. */}
          <button
            type="button"
            data-part="handle"
            aria-label={props.handleLabel}
            className={sheetHandle}
            onClick={props.onHandleClick}
            onKeyDown={props.onHandleKeyDown}
          />
        </div>
      ) : null}
      <div data-part="header" className={cx(sheetHeader, bottom && sheetHeaderDrag)} onPointerDown={drag} onClickCapture={props.onClickCapture}>
        <div className={sheetTitleGroup}>
          {props.title}
          {props.count !== undefined && props.count !== null ? (
            <span data-part="count" className={sheetCount}>
              {props.count}
            </span>
          ) : null}
        </div>
        {props.close}
      </div>
      <div
        ref={props.contentRef}
        data-part="content"
        className={bottom ? sheetContent.bottom : sheetContent.side}
        onPointerDown={bottom ? (event) => props.onPointerDown(event, 'content') : undefined}
        onClickCapture={props.onClickCapture}
      >
        <div ref={props.innerRef}>{props.children}</div>
      </div>
      {props.footer ? (
        <div data-part="footer" className={bottom ? sheetFooter.bottom : sheetFooter.side}>
          {props.footer}
        </div>
      ) : null}
    </>
  )
}

/** The handlers of the sheet element: the wheel and the focus of an input. */
export interface SheetElementHandlers {
  onWheel: (event: WheelEvent<HTMLElement>) => void
  onFocus: (event: FocusEvent<HTMLElement>) => void
}
