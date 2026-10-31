export function firstInvalidRegistrationStep(steps) {
  for (let index = 0; index < steps.length; index++) {
    for (const field of steps[index].querySelectorAll('input, select, textarea')) {
      if (field.disabled || field.type === 'hidden' || (field.closest('[hidden]') && field.closest('[hidden]') !== steps[index])) continue;
      if ((field.required && field.type !== 'checkbox' && (field.type === 'file' ? !field.files?.length : !field.value.trim())) || !field.checkValidity()) return index;
    }
  }
  return -1;
}
