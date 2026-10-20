import { ChevronDown, ChevronUp } from "lucide-react";
import { useRef } from "react";
import type { FocusEventHandler } from "react";

interface NumberStepControlsProps {
  onIncrease: () => void;
  onDecrease: () => void;
  increaseDisabled?: boolean;
  decreaseDisabled?: boolean;
  increaseLabel?: string;
  decreaseLabel?: string;
}

export const NumberStepControls = ({
  onIncrease,
  onDecrease,
  increaseDisabled = false,
  decreaseDisabled = false,
  increaseLabel = "Increase value",
  decreaseLabel = "Decrease value",
}: NumberStepControlsProps) => (
  <div className="kai-node-field-stepper">
    <button
      type="button"
      tabIndex={-1}
      aria-label={increaseLabel}
      disabled={increaseDisabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onIncrease}
      className="kai-node-field-step"
    >
      <ChevronUp size={11} />
    </button>
    <button
      type="button"
      tabIndex={-1}
      aria-label={decreaseLabel}
      disabled={decreaseDisabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onDecrease}
      className="kai-node-field-step"
    >
      <ChevronDown size={11} />
    </button>
  </div>
);

interface ThemedNumberInputProps {
  value?: number | string | null;
  onChange: (value: string) => void;
  name?: string;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
  onBlur?: FocusEventHandler<HTMLInputElement>;
  size?: "default" | "compact";
  className?: string;
}

export const ThemedNumberInput = ({
  value,
  onChange,
  name,
  min,
  max,
  step = 1,
  placeholder,
  disabled = false,
  ariaLabel,
  onBlur,
  size = "default",
  className = "w-full",
}: ThemedNumberInputProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const currentValue = value ?? "";
  const numericValue = currentValue === "" ? null : Number(currentValue);
  const hasNumericValue = numericValue !== null && Number.isFinite(numericValue);
  const increaseDisabled =
    disabled || (hasNumericValue && max !== undefined && numericValue >= max);
  const decreaseDisabled =
    disabled || (hasNumericValue && min !== undefined && numericValue <= min);

  const stepValue = (direction: 1 | -1) => {
    const input = inputRef.current;
    if (!input || disabled) return;

    if (direction === 1) input.stepUp();
    else input.stepDown();

    onChange(input.value);
    input.focus();
  };

  const compact = size === "compact";
  const inputSizeClass = compact ? "px-3 py-2" : "px-4 py-3";

  return (
    <div
      className={`${className} kai-node-field-shell ${disabled ? "is-disabled" : ""}`}
    >
      <input
        ref={inputRef}
        type="number"
        name={name}
        value={currentValue}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        aria-label={ariaLabel}
        placeholder={placeholder}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
        className={`${inputSizeClass} kai-node-field-input [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
      />
      <NumberStepControls
        increaseDisabled={increaseDisabled}
        decreaseDisabled={decreaseDisabled}
        increaseLabel={ariaLabel ? `Increase ${ariaLabel.toLowerCase()}` : undefined}
        decreaseLabel={ariaLabel ? `Decrease ${ariaLabel.toLowerCase()}` : undefined}
        onIncrease={() => stepValue(1)}
        onDecrease={() => stepValue(-1)}
      />
    </div>
  );
};

export default ThemedNumberInput;
