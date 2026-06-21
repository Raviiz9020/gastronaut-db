
import { RecaptchaVerifier, signInWithPhoneNumber, linkWithPhoneNumber, ConfirmationResult, reauthenticateWithCredential, PhoneAuthProvider } from "firebase/auth";
import { auth } from "@/lib/firebase";

// This service manages a single reCAPTCHA verifier instance to prevent leaks.

let recaptchaVerifier: RecaptchaVerifier | null = null;

// Initializes the reCAPTCHA verifier instance on an invisible div.
// Ensures it's only created once.
export const initRecaptcha = (): RecaptchaVerifier => {
  if (!recaptchaVerifier) {
    // Create a container if it doesn't exist, to host the invisible reCAPTCHA.
    if (!document.getElementById("recaptcha-container")) {
        const recaptchaContainer = document.createElement("div");
        recaptchaContainer.id = "recaptcha-container";
        document.body.appendChild(recaptchaContainer);
    }
    
    recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
      size: "invisible",
      callback: () => console.log("Recaptcha solved"),
      "expired-callback": () => {
        console.warn("Recaptcha expired, clearing old instance.");
        clearRecaptcha();
      },
    });
  }
  return recaptchaVerifier;
};

// Normalizes a phone number to the E.164 format required by Firebase.
function normalizePhone(raw: string): string {
  const s = raw.replace(/\s+/g, "");
  if (s.startsWith("+91")) return s;
  if (/^\d{10}$/.test(s)) return `+91${s}`;
  throw new Error("Enter a valid 10-digit Indian phone number.");
}

// Sends the OTP code to the provided phone number.
// It links the number if the user is already signed in, otherwise it starts a new sign-in flow.
export const sendOtp = async (phone: string): Promise<ConfirmationResult> => {
  const verifier = initRecaptcha();
  const normalized = normalizePhone(phone);
  const user = auth.currentUser;

  if (!user) {
    // Standalone phone sign-in (e.g., if you implement phone-only login later)
    return await signInWithPhoneNumber(auth, normalized, verifier);
  }

  // Check if the user already has a phone number linked.
  const hasPhoneNumber = user.providerData.some(
    (provider) => provider.providerId === "phone"
  );
  
  if (hasPhoneNumber) {
    // This is a phone number UPDATE. Firebase requires re-authentication.
    // The modern way is to use reauthenticateWithRedirect or reauthenticateWithPopup.
    // However, for a pure phone update flow, we can use signInWithPhoneNumber to get a new
    // confirmation result that can then be used to update the number.
    // The key is that `signInWithPhoneNumber` returns a ConfirmationResult that can
    // be used with `updatePhoneNumber` via `PhoneAuthProvider.credential`.
    // Let's stick to the simpler link/signin flow for now and adjust if needed.
    // The error is from `link`, so let's check before linking.

    if (user.phoneNumber === normalized) {
      // If the number is the same, we might just be re-verifying.
      // Or we can just let them sign in again to get a new verification.
      // The simplest flow is often to just re-trigger the sign in.
      // This will let them verify and then we can check the result.
       return await signInWithPhoneNumber(auth, normalized, verifier);
    } else {
       // The user wants to change their number. The link method will fail.
       // The most straightforward UX is to use signInWithPhoneNumber again,
       // which will then allow us to get a credential to update the number.
       return await signInWithPhoneNumber(auth, normalized, verifier);
    }
  } else {
    // This is the FIRST time linking a phone number to this account.
    return await linkWithPhoneNumber(user, normalized, verifier);
  }
};

// Clears and destroys the reCAPTCHA verifier instance from the DOM.
// This is critical to prevent the reCAPTCHA badge from appearing on other pages.
export const clearRecaptcha = () => {
  if (recaptchaVerifier) {
    try {
      recaptchaVerifier.clear();
      recaptchaVerifier = null;
    } catch (e) {
      console.error("Error clearing recaptcha: ", e);
    }
  }
  const container = document.getElementById("recaptcha-container");
  if (container) {
    container.remove();
  }
};
