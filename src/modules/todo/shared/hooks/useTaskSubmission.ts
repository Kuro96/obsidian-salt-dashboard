import { useCallback, useRef, useState } from 'react';

interface UseTaskSubmissionOptions {
  canSubmit: () => boolean;
  onSubmit: () => Promise<void>;
  onReset: () => void;
}

export const useTaskSubmission = ({ canSubmit, onSubmit, onReset }: UseTaskSubmissionOptions) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLockRef = useRef(false);

  const submit = useCallback(async () => {
    if (submitLockRef.current || !canSubmit()) {
      return;
    }

    submitLockRef.current = true;
    setIsSubmitting(true);

    try {
      await onSubmit();
      onReset();
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  }, [canSubmit, onReset, onSubmit]);

  const cancel = useCallback(() => {
    if (submitLockRef.current) {
      return;
    }

    onReset();
  }, [onReset]);

  return {
    isSubmitting,
    submit,
    cancel,
  };
};
