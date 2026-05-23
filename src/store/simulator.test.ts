import { beforeEach, describe, expect, it } from 'vitest';
import { CLASSIC_SEQUENCE } from '../test/fixtures';
import { initialState, useSimulatorStore } from './simulator';

describe('useSimulatorStore', () => {
  beforeEach(() => {
    useSimulatorStore.setState(initialState());
  });

  it('initial state has 3 frames and the classic default sequence', () => {
    const s = useSimulatorStore.getState();
    expect(s.frames).toBe(3);
    expect(s.sequence).toEqual(CLASSIC_SEQUENCE);
    expect(s.results).toBeNull();
    expect(s.stepIndex).toBe(-1);
    expect(s.parseError).toBeNull();
    expect(s.manualAlgorithm).toBe('fifo');
  });

  it('setSequenceText with valid input updates sequence and clears parseError', () => {
    useSimulatorStore.getState().setSequenceText('1 2 3');
    expect(useSimulatorStore.getState().sequence).toEqual([1, 2, 3]);
    expect(useSimulatorStore.getState().parseError).toBeNull();
  });

  it('setSequenceText with invalid input sets parseError', () => {
    useSimulatorStore.getState().setSequenceText('1 x 3');
    expect(useSimulatorStore.getState().parseError).toContain("'x'");
  });

  it('setFrames clamps to MIN_FRAMES = 1', () => {
    useSimulatorStore.getState().setFrames(0);
    expect(useSimulatorStore.getState().frames).toBe(1);
    useSimulatorStore.getState().setFrames(-5);
    expect(useSimulatorStore.getState().frames).toBe(1);
  });

  it('run() with valid input fills results', () => {
    useSimulatorStore.getState().run();
    const r = useSimulatorStore.getState().results;
    expect(r).not.toBeNull();
    expect(r?.fifo.faults).toBe(10);
  });

  it('run() with parseError is a no-op', () => {
    useSimulatorStore.getState().setSequenceText('x');
    useSimulatorStore.getState().run();
    expect(useSimulatorStore.getState().results).toBeNull();
  });

  it('stepForward() requires results; without them it is a no-op', () => {
    useSimulatorStore.getState().stepForward();
    expect(useSimulatorStore.getState().stepIndex).toBe(-1);
  });

  it('stepForward() does not exceed steps.length - 1', () => {
    const s = useSimulatorStore.getState();
    s.run();
    const total = useSimulatorStore.getState().results?.fifo.steps.length ?? 0;
    for (let i = 0; i < total + 5; i++) {
      useSimulatorStore.getState().stepForward();
    }
    expect(useSimulatorStore.getState().stepIndex).toBe(total - 1);
  });

  it('stepBack() does not go below -1', () => {
    useSimulatorStore.getState().run();
    for (let i = 0; i < 20; i++) {
      useSimulatorStore.getState().stepBack();
    }
    expect(useSimulatorStore.getState().stepIndex).toBe(-1);
  });

  it('setManualAlgorithm switches the algorithm without resetting stepIndex', () => {
    const s = useSimulatorStore.getState();
    s.run();
    s.stepForward();
    s.stepForward();
    const before = useSimulatorStore.getState().stepIndex;
    useSimulatorStore.getState().setManualAlgorithm('lru');
    expect(useSimulatorStore.getState().manualAlgorithm).toBe('lru');
    expect(useSimulatorStore.getState().stepIndex).toBe(before);
  });

  it('stepForward uses the limit of the selected manual algorithm', () => {
    const s = useSimulatorStore.getState();
    s.run();
    s.setManualAlgorithm('opt');
    const totalOpt =
      useSimulatorStore.getState().results?.opt.steps.length ?? 0;
    for (let i = 0; i < totalOpt + 5; i++) {
      useSimulatorStore.getState().stepForward();
    }
    expect(useSimulatorStore.getState().stepIndex).toBe(totalOpt - 1);
  });

  it('reset() returns everything to defaults', () => {
    const s = useSimulatorStore.getState();
    s.setSequenceText('1 2 3');
    s.setFrames(7);
    s.run();
    s.stepForward();
    s.reset();
    const after = useSimulatorStore.getState();
    expect(after.frames).toBe(3);
    expect(after.sequence).toEqual(CLASSIC_SEQUENCE);
    expect(after.results).toBeNull();
    expect(after.stepIndex).toBe(-1);
  });
});
