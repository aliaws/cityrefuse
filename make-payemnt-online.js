import { getPaymentSignature, getCcFeePercentage } from 'backend/payment-signature.web';
import wixWindowFrontend from "wix-window-frontend";

let paymentInProgress = false;
let percentage;

$w.onReady(async function () {

    percentage = await getCcFeePercentage();

    let description = $w("#description").text;
    $w("#description").text = description.replace(/X/g, String(percentage));

    const fieldKey        = "#amount";
    const submitBtn       = "#submit";
    const payNowBtn       = "#payNow";
    const section1        = "#step1";
    const section2        = "#step2";

    $w(section2).hide();
    $w(section2).collapse();
    $w(submitBtn).disable();
    $w("#labelFee").hide();
    $w("#valueFee").hide();

    $w(fieldKey).onInput((event) => {
        let value = event.target.value.replace(/[^0-9.]|\.(?=.*\.)/g, '');
        $w(fieldKey).value = value ? `$${value}` : '';
    });

    $w(fieldKey).onBlur(() => {
        let value = $w(fieldKey).value.replace(/[^0-9.]/g, '');
        if (value) {
            $w(fieldKey).value = Number(value).toLocaleString('en-US', {
                style:    'currency',
                currency: 'USD',
            });
        }
    });

    $w(submitBtn).onClick(async () => {
        const rawAmount = $w(fieldKey).value.replace(/[^0-9.]/g, '');
        if (!rawAmount) return;

        const subtotal = parseFloat(rawAmount);
        const ccFee = parseFloat((subtotal * (percentage / 100)).toFixed(2));
        const total = parseFloat((subtotal + ccFee).toFixed(2));

        $w("#valueSubtotal").text = `$${subtotal.toFixed(2)}`;
        $w("#valueTotal").text = `$${total.toFixed(2)}`;

        if (percentage === 0 || ccFee === 0) {
            $w("#labelFee").hide();
            $w("#valueFee").hide();
        } else {
            $w("#labelFee").show();
            $w("#valueFee").show();
            $w("#labelFee").text = `Credit Card Fee (${percentage}%)`;
            $w("#valueFee").text = `$${ccFee.toFixed(2)}`;
        }

        await $w(section1).hide("slide", { direction: "left", duration: 500 });
        $w(section1).collapse();
        await $w(section2).expand();
        $w(section2).show("slide", { direction: "right", duration: 500 });
    });

    $w(payNowBtn).onClick(async () => {
        if (paymentInProgress) return;
        paymentInProgress = true;

        const rawAmount = $w(fieldKey).value.replace(/[^0-9.]/g, '');
        if (!rawAmount) {
            paymentInProgress = false;
            return;
        }

        $w(payNowBtn).disable();
        $w(payNowBtn).label = "Redirecting...";

        try {
            const { payment_url, params } = await getPaymentSignature(rawAmount);
            wixWindowFrontend.postMessage({ action: payment_url, params });
        } catch (err) {
            console.error("Forte error:", err.message);
            $w(payNowBtn).label = "Error — Try Again";
            $w(payNowBtn).enable();
            paymentInProgress = false;
        }
    });

    $w("#recaptcha").onVerified(() => $w(submitBtn).enable());
    $w("#recaptcha").onTimeout(() => $w(submitBtn).disable());
});