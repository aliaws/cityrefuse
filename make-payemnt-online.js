import { fetch } from 'wix-fetch';

$w.onReady(function () {
    const fieldKey        = "#amount";
    const submitBtn       = "#submit";
    const payNowBtn       = "#payNow";
    const descriptionText = "#description";
    const section1        = "#step1";
    const section2        = "#step2";

    $w(section2).hide();
    $w(section2).collapse();
    $w(submitBtn).disable();

    $w(fieldKey).onInput((event) => {
        let value = event.target.value.replace(/\D/g, '');
        $w(fieldKey).value = value ? `$${value}` : '';
    });

    $w(fieldKey).onBlur(() => {
        let value = $w(fieldKey).value.replace(/\D/g, '');
        if (value) {
            $w(fieldKey).value = Number(value).toLocaleString('en-US', {
                style:    'currency',
                currency: 'USD',
            });
        }
    });

    $w(submitBtn).onClick(async () => {
        const amountValue = $w(fieldKey).value;
        if (amountValue) {
            $w(descriptionText).text = `Click "Pay Now" to pay your bill for ${amountValue}`;
            await $w(section1).hide("slide", { direction: "left", duration: 500 });
            $w(section1).collapse();
            await $w(section2).expand();
            $w(section2).show("slide", { direction: "right", duration: 500 });
        }
    });

    $w(payNowBtn).onClick(async () => {
        const rawAmount = $w(fieldKey).value.replace(/[^0-9.]/g, '');
        if (!rawAmount) return;

        $w(payNowBtn).disable();
        $w(payNowBtn).label = "Redirecting...";

        try {
            const res = await fetch("https://lammersmedia.wixsite.com/capitalcityrefuse/_functions/forte_params", {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ amount: rawAmount })
            });

            const params = await res.json();

            if (params.error) throw new Error(params.error);

            $w("#htmlPostGate").postMessage({
                type:   "SUBMIT_FORTE",
                params: params
            });

        } catch (err) {
            console.error("Forte error:", err.message);
            $w(payNowBtn).label = "Error — Try Again";
            $w(payNowBtn).enable();
        }
    });

    $w("#recaptcha").onVerified(() => $w(submitBtn).enable());
    $w("#recaptcha").onTimeout(() => $w(submitBtn).disable());
});