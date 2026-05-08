import React, { useRef, useEffect } from 'react';

interface AutoResizeTextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onSubmit'> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: () => void;
  minHeight?: string;
}

export const AutoResizeTextarea: React.FC<AutoResizeTextareaProps> = ({
  value,
  onChange,
  onSubmit,
  className = '',
  minHeight = '48px',
  ...props
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (e.shiftKey || e.ctrlKey) {
        // Allow default newline behavior by not preventing default
        // But since we want to be explicit as per instructions:
        e.preventDefault();
        const target = e.target as HTMLTextAreaElement;
        const start = target.selectionStart;
        const end = target.selectionEnd;
        const newValue = value.substring(0, start) + '\n' + value.substring(end);
        
        // Manually update the value
        const syntheticEvent = {
          target: { value: newValue }
        } as React.ChangeEvent<HTMLTextAreaElement>;
        
        onChange(syntheticEvent);
        
        // Set cursor position after render
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 1;
          }
        }, 0);
      } else {
        // Enter only -> submit
        e.preventDefault();
        onSubmit();
      }
    }
    
    if (props.onKeyDown) {
      props.onKeyDown(e);
    }
  };

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      onKeyDown={handleKeyDown}
      className={`resize-y overflow-hidden ${className}`}
      style={{ minHeight, ...props.style }}
      rows={1}
      {...props}
    />
  );
};
