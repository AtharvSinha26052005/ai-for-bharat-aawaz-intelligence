import { debounce, debounceWithCancel } from './debounce';

describe('debounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('should delay function execution', () => {
    const callback = jest.fn();
    const debounced = debounce(callback, 300);

    debounced('test');
    expect(callback).not.toHaveBeenCalled();

    jest.advanceTimersByTime(300);
    expect(callback).toHaveBeenCalledWith('test');
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should cancel previous calls when invoked multiple times', () => {
    const callback = jest.fn();
    const debounced = debounce(callback, 300);

    debounced('first');
    jest.advanceTimersByTime(100);
    debounced('second');
    jest.advanceTimersByTime(100);
    debounced('third');

    expect(callback).not.toHaveBeenCalled();

    jest.advanceTimersByTime(300);
    expect(callback).toHaveBeenCalledWith('third');
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should use default delay of 300ms', () => {
    const callback = jest.fn();
    const debounced = debounce(callback);

    debounced('test');
    jest.advanceTimersByTime(299);
    expect(callback).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledWith('test');
  });

  it('should handle multiple arguments', () => {
    const callback = jest.fn();
    const debounced = debounce(callback, 300);

    debounced('arg1', 'arg2', 'arg3');
    jest.advanceTimersByTime(300);

    expect(callback).toHaveBeenCalledWith('arg1', 'arg2', 'arg3');
  });

  it('should work with different delay values', () => {
    const callback = jest.fn();
    const debounced = debounce(callback, 500);

    debounced('test');
    jest.advanceTimersByTime(499);
    expect(callback).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledWith('test');
  });
});

describe('debounceWithCancel', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('should provide a cancel method', () => {
    const callback = jest.fn();
    const { debounced, cancel } = debounceWithCancel(callback, 300);

    debounced('test');
    expect(callback).not.toHaveBeenCalled();

    cancel();
    jest.advanceTimersByTime(300);
    expect(callback).not.toHaveBeenCalled();
  });

  it('should allow execution after cancel if called again', () => {
    const callback = jest.fn();
    const { debounced, cancel } = debounceWithCancel(callback, 300);

    debounced('first');
    cancel();
    debounced('second');
    jest.advanceTimersByTime(300);

    expect(callback).toHaveBeenCalledWith('second');
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should handle multiple cancels safely', () => {
    const callback = jest.fn();
    const { debounced, cancel } = debounceWithCancel(callback, 300);

    debounced('test');
    cancel();
    cancel();
    cancel();

    jest.advanceTimersByTime(300);
    expect(callback).not.toHaveBeenCalled();
  });

  it('should work normally without calling cancel', () => {
    const callback = jest.fn();
    const { debounced } = debounceWithCancel(callback, 300);

    debounced('test');
    jest.advanceTimersByTime(300);

    expect(callback).toHaveBeenCalledWith('test');
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
