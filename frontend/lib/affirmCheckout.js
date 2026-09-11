export function launchAffirmCheckout(affirmData, onSuccess, onFail) {
  if (!affirmData?.publicKey || !affirmData?.scriptUrl || !affirmData?.checkout) throw new Error('Affirm checkout configuration is unavailable');
  const open = () => {
    if (!window.affirm?.checkout) return onFail(new Error('Affirm checkout failed to load'));
    window.affirm.checkout(affirmData.checkout);
    window.affirm.checkout.open({ onSuccess, onFail, onValidationError: onFail });
  };
  window._affirm_config = { public_api_key: affirmData.publicKey, script: affirmData.scriptUrl, locale: 'en_CA', country_code: 'CAN' };
  if (window.affirm?.checkout) return open();
  const existing = document.querySelector('script[data-loadlyx-affirm]');
  if (existing) { existing.addEventListener('load', open, { once: true }); return; }
  const script = document.createElement('script');
  script.src = affirmData.scriptUrl; script.async = true; script.dataset.loadlyxAffirm = 'true';
  script.onload = open; script.onerror = () => onFail(new Error('Affirm checkout failed to load'));
  document.head.appendChild(script);
}
