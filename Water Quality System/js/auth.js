import { showLoading } from "./main.js";

function setupForms() {
  const currentPath = window.location.pathname;
  // Setup forms based on current page
  if (currentPath.includes("signup.html")) {
    setupSignupPasswordValidation();
    const signupForm = document.getElementById("signupForm");
    if (signupForm) {
      signupForm.addEventListener("submit", handleSignup);
    }
  } else if (currentPath.includes("login.html")) {
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
      loginForm.addEventListener("submit", handleLogin);
    }
  }
}

setupForms();

function handleLogin(event) {
  event.preventDefault();
  showLoading();

  setTimeout(() => {
    localStorage.setItem("isLoggedIn", "true");
    // Change the redirection target to tank details page if that is desired.
    window.location.href = "tank-detail.html";
  }, 1500);
}

function handleSignup(event) {
  event.preventDefault();
  // First check if passwords match
  if (!validatePasswordMatch("password", "confirmPassword", "passwordMatch")) {
    alert("Please make sure your passwords match.");
    return; // Stop the signup process if passwords don't match
  }
  showLoading();
  setTimeout(() => {
    localStorage.setItem("isLoggedIn", "true");
    // Change the redirection target to tank details page if that is desired.
    window.location.href = "tank-detail.html";
  }, 1500);
}

function validatePasswordMatch(passwordId, confirmPasswordId, matchElementId) {
  const password = document.getElementById(passwordId).value;
  const confirmPassword = document.getElementById(confirmPasswordId).value;
  const matchElement = document.getElementById(matchElementId);

  if (confirmPassword) {
    const matches = password === confirmPassword;
    matchElement.innerHTML = `
      <div class="requirement ${matches ? "valid" : "invalid"}">
        <i class="fas ${matches ? "fa-check" : "fa-circle"}"></i>
        Passwords ${matches ? "match" : "do not match"}
      </div>
    `;
    return matches;
  }
  return false;
}

function handleResetPassword(event) {
  event.preventDefault();
  // First check if passwords match
  if (
    !validatePasswordMatch(
      "newPassword",
      "confirmNewPassword",
      "newPasswordMatch"
    )
  ) {
    alert("Please make sure your passwords match.");
    return; // Stop the reset password process if passwords don't match
  }
  alert("Password has been reset successfully!");
  window.location.href = "login.html";
}

function handleSendResetCode(event) {
  event.preventDefault();
  document.getElementById("sendCodeForm").classList.add("hidden");
  document.getElementById("verifyCodeForm").classList.remove("hidden");
}

function handleVerifyCode(event) {
  event.preventDefault();
  document.getElementById("verifyCodeForm").classList.add("hidden");
  document.getElementById("newPasswordForm").classList.remove("hidden");

  // Setup password validation after revealing the form
  setupResetPasswordValidation();
}

function setupSignupPasswordValidation() {
  const password = document.getElementById("password");
  const confirmPassword = document.getElementById("confirmPassword");

  if (password && confirmPassword) {
    password.onkeyup = function () {
      validatePasswordMatch("password", "confirmPassword", "passwordMatch");
    };

    confirmPassword.onkeyup = function () {
      validatePasswordMatch("password", "confirmPassword", "passwordMatch");
    };
  }
}

function setupResetPasswordValidation() {
  const newPasswordForm = document.getElementById("newPasswordForm");

  if (newPasswordForm) {
    const passwordInputs = newPasswordForm.querySelectorAll(".password-input");

    if (passwordInputs.length >= 2) {
      passwordInputs[0].id = "newPassword";
      passwordInputs[1].id = "confirmNewPassword";

      if (!document.getElementById("newPasswordMatch")) {
        const matchDiv = document.createElement("div");
        matchDiv.className = "password-requirements";
        matchDiv.id = "newPasswordMatch";
        newPasswordForm.insertBefore(
          matchDiv,
          newPasswordForm.querySelector("button")
        );
      }

      passwordInputs[0].onkeyup = function () {
        validatePasswordMatch(
          "newPassword",
          "confirmNewPassword",
          "newPasswordMatch"
        );
      };

      passwordInputs[1].onkeyup = function () {
        validatePasswordMatch(
          "newPassword",
          "confirmNewPassword",
          "newPasswordMatch"
        );
      };
    }
  }
}

// Add after the setupResetPasswordValidation function and before the event listeners
function setupPasswordVisibilityToggles() {
  const toggleButtons = document.querySelectorAll(".toggle-password");
  toggleButtons.forEach((button) => {
    // Remove any existing event listeners to prevent duplicates
    button.removeEventListener("click", handleToggleClick);
    // Add new click listener
    button.addEventListener("click", handleToggleClick);
  });
}

function handleToggleClick() {
  const input = this.previousElementSibling;
  const type = input.getAttribute("type") === "password" ? "text" : "password";
  input.setAttribute("type", type);
  this.classList.toggle("fa-eye");
  this.classList.toggle("fa-eye-slash");
}

// Initialize application
document.addEventListener("DOMContentLoaded", function () {
  // Setup password visibility toggles
  setupPasswordVisibilityToggles();

  // Setup forms based on current page
  const currentPath = window.location.pathname;

  if (currentPath.includes("signup.html")) {
    setupSignupPasswordValidation();

    const signupForm = document.getElementById("signupForm");
    if (signupForm) {
      signupForm.addEventListener("submit", handleSignup);
    }
  } else if (currentPath.includes("login.html")) {
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
      loginForm.addEventListener("submit", handleLogin);
    }
  } else if (currentPath.includes("forgot-password.html")) {
    const sendCodeForm = document.getElementById("sendCodeForm");
    const verifyCodeForm = document.getElementById("verifyCodeForm");
    const newPasswordForm = document.getElementById("newPasswordForm");

    if (sendCodeForm) {
      sendCodeForm.addEventListener("submit", handleSendResetCode);
    }

    if (verifyCodeForm) {
      verifyCodeForm.addEventListener("submit", handleVerifyCode);
    }

    if (newPasswordForm) {
      newPasswordForm.addEventListener("submit", handleResetPassword);
    }
  }
});

export function checkProtectedRoute(currentPath) {
  // Check for authentication on protected pages
  if (
    !currentPath.includes("login.html") &&
    !currentPath.includes("signup.html") &&
    !currentPath.includes("forgot-password.html") &&
    !currentPath.includes("index.html")
  ) {
    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
    if (!isLoggedIn) {
      window.location.href = "login.html";
    }
  }
}
