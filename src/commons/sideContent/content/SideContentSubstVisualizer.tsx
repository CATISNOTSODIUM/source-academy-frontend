import 'js-slang/dist/editors/ace/theme/source';
import { Button, ButtonGroup, Card, Classes, Divider, Popover, Pre, Slider } from '@blueprintjs/core';
import { getHotkeyHandler, HotkeyItem } from '@mantine/hooks';
import classNames from 'classnames';
import { HighlightRulesSelector, ModeSelector } from 'js-slang/dist/editors/ace/modes/source';
import React, { useCallback, useEffect, useState } from 'react';

import { beginAlertSideContent } from '../SideContentActions';
import { SideContentLocation, SideContentType } from '../SideContentTypes';
import { IStepperPropAST } from 'js-slang/dist/stepper/expression_stepper/v2-highlighted/stepper';
import stepper from 'js-slang/dist/stepper/expression_stepper/v2-highlighted/expression';
import { useDispatch } from 'react-redux';

const SubstDefaultText = () => {
  return (
    <div>
      <div id="substituter-default-text" className={Classes.RUNNING_TEXT}>
        Welcome to the Stepper! 
        <br />
        <br />
        On this tab, the REPL will be hidden from view, so do check that your code has no errors
        before running the stepper. You may use this tool by writing your program on the left, then
        dragging the slider above to see its evaluation.
        <br />
        <br />
        On even-numbered steps, the part of the program that will be evaluated next is highlighted
        in yellow. On odd-numbered steps, the result of the evaluation is highlighted in green. You
        can change the maximum steps limit (500-5000, default 1000) in the control bar.
        <br />
        <br />
        <Divider />
        Some useful keyboard shortcuts:
        <br />
        <br />
        a: Move to the first step
        <br />
        e: Move to the last step
        <br />
        f: Move to the next step
        <br />
        b: Move to the previous step
        <br />
        <br />
        Note that these shortcuts are only active when the browser focus is on this tab (click on or
        above the explanation text).
      </div>
    </div>
  );
};

const SubstCodeDisplay = (props: { content: string }) => {
  return (
    <Card>
      <Pre className="result-output">{props.content}</Pre>
    </Card>
  );
};

type SubstVisualizerPropsAST = {
  content: IStepperPropAST[];
  workspaceLocation: SideContentLocation;
}

const SideContentSubstVisualizer: React.FC<SubstVisualizerPropsAST> = props => {
  const [stepValue, setStepValue] = useState(1);
  const lastStepValue = props.content.length;
  const hasRunCode = lastStepValue !== 0;
  const dispatch = useDispatch();
  const alertSideContent = useCallback(
    () => dispatch(beginAlertSideContent(SideContentType.substVisualizer, props.workspaceLocation)),
    [props.workspaceLocation, dispatch]
  );

  // set source mode as 2
  useEffect(() => {
    HighlightRulesSelector(2);
    ModeSelector(2);
  }, []);

  // reset stepValue when content changes
  useEffect(() => {
    setStepValue(1);
    if (props.content.length > 0) {
      alertSideContent();
    }
  }, [props.content, setStepValue, alertSideContent]);

  const stepFirst = () => setStepValue(1);
  const stepLast = () => setStepValue(lastStepValue);
  const stepPrevious = () => setStepValue(Math.max(1, stepValue - 1));
  const stepNext = () => setStepValue(Math.min(props.content.length, stepValue + 1));

    // Setup hotkey bindings
  const hotkeyBindings: HotkeyItem[] = hasRunCode
    ? [
        ['a', stepFirst],
        ['f', stepNext],
        ['b', stepPrevious],
        ['e', stepLast]
      ]
    : [
        ['a', () => {}],
        ['f', () => {}],
        ['b', () => {}],
        ['e', () => {}]
      ];
  const hotkeyHandler = getHotkeyHandler(hotkeyBindings);
  
  const getExplanation = useCallback(
    (value: number): string => {
      const contIndex = value <= lastStepValue ? value - 1 : 0;
      return props.content[contIndex].explanation;
    }, [lastStepValue, props.content]
  )

  const getAST = useCallback(
    (value: number): IStepperPropAST => {
      const contIndex = value <= lastStepValue ? value - 1 : 0;
      const astNode = props.content[contIndex];
      return astNode;
    },
    [lastStepValue, props.content]
  );


  return (
    <div
      className={classNames('sa-substituter', Classes.DARK)}
      onKeyDown={hotkeyHandler}
      tabIndex={-1} // tab index necessary to fire keydown events on div element
    >
      <Slider
        disabled={!hasRunCode}
        min={1}
        max={lastStepValue}
        onChange={setStepValue}
        value={stepValue <= lastStepValue ? stepValue : 1}
      />
      
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <ButtonGroup>
          <Button
            disabled={!hasRunCode}
            icon="double-chevron-left"
            onClick={stepFirst}
          />
          <Button
            disabled={!hasRunCode || stepValue === 1}
            icon="chevron-left"
            onClick={stepPrevious}
          />
          <Button
            disabled={!hasRunCode || stepValue === lastStepValue}
            icon="chevron-right"
            onClick={stepNext}
          />
          <Button
            disabled={!hasRunCode}
            icon="double-chevron-right"
            onClick={stepLast}
          />
        </ButtonGroup>
      </div>{' '}
      <br />
      {hasRunCode ? (
       <StepperDisplayer content={getAST(stepValue)}/>
      ) : (
        <SubstDefaultText />
      )}
      {hasRunCode ? (
        <SubstCodeDisplay
          content={
            getExplanation(stepValue)
          }
        />
      ) : null}
      <div className="stepper-display">
        <div>Expression stepper</div>
        <div>{"Double arrows << and >> are replaced with stepFirst and stepLast."}</div>
      </div>
    </div>
  )
}

// Custom Stepper code displayer (Replace React ACE Editor)
interface StepperDisplayerProps {
  content: IStepperPropAST;
  // May add additional fields (such as styles, ...)
}

// custom AST renderer


function StepperDisplayer(props: StepperDisplayerProps) {
  const getConvertedNode = useCallback(
    (): React.ReactNode => {
      return convertNode(props.content.ast);
    }, [props]
  );

  const checkTargetNode = useCallback(
    (node: stepper.StepperExpression): boolean => {
      const target = props.content.marker.ast;
      return (node === target);
    }, [props]
  )

  function convertNode(node: stepper.StepperExpression): React.ReactNode {
    const convertors = {
      Literal(node: stepper.StepperLiteral) {
        return <span>{node.value}</span>
      },
      UnaryExpression(node: stepper.StepperUnaryExpression) {
        return <span>{` ${node.operator}`}{convertNode(node.argument)}</span>
      },
      BinaryExpression(node: stepper.StepperBinaryExpression) {
        return <span>{convertNode(node.left)}{` ${node.operator} `}{convertNode(node.right)}</span>
      },
      LogicalExpression(node: stepper.StepperLogicalExpression) {
        return <span>{convertNode(node.left)}{` ${node.operator} `}{convertNode(node.right)}</span>
      },
      ConditionalExpression(node: stepper.StepperConditionalExpression) {
        return <span>{convertNode(node.test)}{" ? "}{convertNode(node.consequent)}{" : "}{convertNode(node.alternate)}</span>
      }
    }
    const convertor = convertors[node.type];
    // @ts-expect-error
    const converted = convertor(node);
    if (!checkTargetNode(node)) {
      return <span>{converted}</span>
    } else {
      return <span className={props.content.marker.type}>
          <Popover
            interactionKind="hover" 
            placement="bottom"
            minimal={true}
            content={
            <div className=".bp5-running-text {{.modifier}}">
              <blockquote className="bp5-blockquote">
                {props.content.explanation}
              </blockquote>
              <pre className="bp5-code-block"><code>{JSON.stringify(node, null, 4)}</code></pre>
            </div>
            }
          >
            {converted}
          </Popover>
      </span>;
    }
  }

  return <div className="stepper-display">
      {getConvertedNode()}
    </div>
}
/*
const _SideContentSubstVisualizer: React.FC<SubstVisualizerProps> = props => {
  const [stepValue, setStepValue] = useState(1);
  const lastStepValue = props.content.length;
  const hasRunCode = lastStepValue !== 0; // 'content' property is initialised to '[]' by Playground component

  const dispatch = useDispatch();
  const alertSideContent = useCallback(
    () => dispatch(beginAlertSideContent(SideContentType.substVisualizer, props.workspaceLocation)),
    [props.workspaceLocation, dispatch]
  );

  // set source mode as 2
  useEffect(() => {
    HighlightRulesSelector(2);
    ModeSelector(2);
  }, []);

  // reset stepValue when content changes
  useEffect(() => {
    setStepValue(1);
    if (props.content.length > 0) {
      alertSideContent();
    }
  }, [props.content, setStepValue, alertSideContent]);

  // Stepper function call helpers
  const getPreviousFunctionCall = useCallback(
    (value: number) => {
      const contIndex = value <= lastStepValue ? value - 1 : 0;
      const currentFunction = props.content[contIndex]?.function;
      if (currentFunction === undefined) {
        return null;
      }
      for (let i = contIndex - 1; i > -1; i--) {
        const previousFunction = props.content[i].function;
        if (previousFunction !== undefined && currentFunction === previousFunction) {
          return i + 1;
        }
      }
      return null;
    },
    [lastStepValue, props.content]
  );

  const getNextFunctionCall = useCallback(
    (value: number) => {
      const contIndex = value <= lastStepValue ? value - 1 : 0;
      const currentFunction = props.content[contIndex]?.function;
      if (currentFunction === undefined) {
        return null;
      }
      for (let i = contIndex + 1; i < props.content.length; i++) {
        const nextFunction = props.content[i].function;
        if (nextFunction !== undefined && currentFunction === nextFunction) {
          return i + 1;
        }
      }
      return null;
    },
    [lastStepValue, props.content]
  );

  // Stepper handlers
  const hasPreviousFunctionCall = getPreviousFunctionCall(stepValue) !== null;
  const hasNextFunctionCall = getNextFunctionCall(stepValue) !== null;
  const stepPreviousFunctionCall = () =>
    setStepValue(getPreviousFunctionCall(stepValue) ?? stepValue);
  const stepNextFunctionCall = () => setStepValue(getNextFunctionCall(stepValue) ?? stepValue);
  const stepFirst = () => setStepValue(1);
  const stepLast = () => setStepValue(lastStepValue);
  const stepPrevious = () => setStepValue(Math.max(1, stepValue - 1));
  const stepNext = () => setStepValue(Math.min(props.content.length, stepValue + 1));

  // Setup hotkey bindings
  const hotkeyBindings: HotkeyItem[] = hasRunCode
    ? [
        ['a', stepFirst],
        ['f', stepNext],
        ['b', stepPrevious],
        ['e', stepLast]
      ]
    : [
        ['a', () => {}],
        ['f', () => {}],
        ['b', () => {}],
        ['e', () => {}]
      ];
  const hotkeyHandler = getHotkeyHandler(hotkeyBindings);

  // Rendering helpers
  const getText = useCallback(
    (value: number) => {
      const contIndex = value <= lastStepValue ? value - 1 : 0;
      const pathified = props.content[contIndex];
      const redexed = pathified.code;
      const redex = pathified.redex;
      const split = pathified.code.split('@redex');
      if (split.length > 1) {
        let text = split[0];
        for (let i = 1; i < split.length; i++) {
          text = text + redex + split[i];
        }
        return text;
      } else {
        return redexed;
      }
    },
    [lastStepValue, props.content]
  );

  const getDiffMarkers = useCallback(
    (value: number) => {
      const contIndex = value <= lastStepValue ? value - 1 : 0;
      const pathified = props.content[contIndex];
      const redexed = pathified.code;
      const redex = pathified.redex.split('\n');

      const diffMarkers = [] as any[];
      if (redex.length > 0) {
        const mainprog = redexed.split('@redex');
        let text = mainprog[0];
        let front = text.split('\n');

        let startR = front.length - 1;
        let startC = front[startR].length;

        for (let i = 0; i < mainprog.length - 1; i++) {
          const endR = startR + redex.length - 1;
          const endC =
            redex.length === 1
              ? startC + redex[redex.length - 1].length
              : redex[redex.length - 1].length;

          diffMarkers.push({
            startRow: startR,
             % 2 === 0 ? 'beforeMarker' :startCol: startC,
            endRow: endR,
            endCol: endC,
            className: value 'afterMarker',
            type: 'background'
          });

          text = text + redex + mainprog[i + 1];
          front = text.split('\n');
          startR = front.length - 1;
          startC = front[startR].length;
        }
      }
      return diffMarkers;
    },
    [lastStepValue, props.content]
  );

  return (
    <div
      className={classNames('sa-substituter', Classes.DARK)}
      onKeyDown={hotkeyHandler}
      tabIndex={-1} // tab index necessary to fire keydown events on div element
    >
      <Slider
        disabled={!hasRunCode}
        min={1}
        max={lastStepValue}
        onChange={setStepValue}
        value={stepValue <= lastStepValue ? stepValue : 1}
      />
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <ButtonGroup>
          <Button
            disabled={!hasRunCode || !hasPreviousFunctionCall}
            icon="double-chevron-left"
            onClick={stepPreviousFunctionCall}
          />
          <Button
            disabled={!hasRunCode || stepValue === 1}
            icon="chevron-left"
            onClick={stepPrevious}
          />
          <Button
            disabled={!hasRunCode || stepValue === lastStepValue}
            icon="chevron-right"
            onClick={stepNext}
          />
          <Button
            disabled={!hasRunCode || !hasNextFunctionCall}
            icon="double-chevron-right"
            onClick={stepNextFunctionCall}
          />
        </ButtonGroup>
      </div>{' '}
      <br />
      {hasRunCode ? (
        <AceEditor
          className="react-ace"
          mode="source2defaultNONE"
          theme="source"
          fontSize={17}
          highlightActiveLine={false}
          wrapEnabled={true}
          height="unset"
          width="100%"
          showGutter={false}
          readOnly={true}
          maxLines={Infinity}
          value={getText(stepValue)}
          markers={getDiffMarkers(stepValue)}
          setOptions={{
            fontFamily: "'Inconsolata', 'Consolas', monospace"
          }}
        />
      ) : (
        <SubstDefaultText />
      )}
      {hasRunCode ? (
        <SubstCodeDisplay
          content={
            stepValue <= lastStepValue
              ? props.content[stepValue - 1].explanation
              : props.content[0].explanation
          }
        />
      ) : null}
    </div>
  );
};
*/
export default SideContentSubstVisualizer;
