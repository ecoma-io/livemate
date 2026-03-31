<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import { useAuthStore } from '../../stores/auth';

const { t } = useI18n();
const auth = useAuthStore();
const router = useRouter();

const username = ref('');
const password = ref('');
const showPassword = ref(false);
const errorMessage = ref('');
const loading = ref(false);

async function handleSubmit() {
  errorMessage.value = '';
  loading.value = true;
  const success = auth.login(username.value, password.value);
  loading.value = false;
  if (success) {
    await router.push({ name: 'dashboard' });
  } else {
    errorMessage.value = t('loginView.invalidCredentials');
  }
}
</script>

<template>
  <div
    data-testid="login-outer"
    class="h-dvh w-full flex items-center justify-center bg-primary-800 sm:bg-surface-50 sm:dark:bg-surface-950 sm:px-4"
  >
    <!-- Card -->
    <div
      data-testid="login-card"
      class="w-full h-full flex flex-col overflow-hidden bg-primary-800 sm:h-auto sm:max-w-sm sm:bg-surface-0 sm:dark:bg-surface-900 sm:rounded-2xl sm:shadow-xl sm:border sm:border-surface-200 sm:dark:border-surface-800"
    >
      <!-- Header band -->
      <div class="bg-primary-800 px-8 py-8 flex flex-col items-center gap-3">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 512 512"
          fill="none"
          class="w-14 h-14"
          aria-hidden="true"
        >
          <path
            d="M144 144 A 160 160 0 0 0 144 368"
            stroke="#ffffff"
            stroke-width="40"
            stroke-linecap="round"
            opacity="0.4"
          />
          <path
            d="M88 88 A 240 240 0 0 0 88 424"
            stroke="#ffffff"
            stroke-width="40"
            stroke-linecap="round"
            opacity="0.7"
          />
          <path
            d="M368 144 A 160 160 0 0 1 368 368"
            stroke="#ffffff"
            stroke-width="40"
            stroke-linecap="round"
            opacity="0.4"
          />
          <path
            d="M424 88 A 240 240 0 0 1 424 424"
            stroke="#ffffff"
            stroke-width="40"
            stroke-linecap="round"
            opacity="0.7"
          />
          <circle
            cx="256"
            cy="256"
            r="100"
            fill="#ffffff"
          />
          <polygon
            points="230,200 230,312 310,256"
            fill="#5b21b6"
          />
        </svg>
        <div class="text-center">
          <h1 class="text-2xl font-bold text-white tracking-tight">
            {{ t('loginView.title') }}
          </h1>
          <p class="text-primary-200 text-sm mt-1">
            {{ t('loginView.subtitle') }}
          </p>
        </div>
      </div>

      <!-- Form body -->
      <div class="px-8 py-8 flex-1 flex flex-col justify-center sm:flex-none sm:justify-start sm:bg-transparent">
        <form
          class="flex flex-col gap-5"
          @submit.prevent="handleSubmit"
        >
          <div class="flex flex-col gap-1.5">
            <label
              for="login-username"
              class="text-sm font-medium text-primary-100 sm:text-surface-700 sm:dark:text-surface-300"
            >
              {{ t('loginView.usernameLabel') }}
            </label>
            <InputText
              id="login-username"
              v-model="username"
              data-testid="username-input"
              autocomplete="username"
              class="w-full"
              :disabled="loading"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label
              for="login-password"
              class="text-sm font-medium text-primary-100 sm:text-surface-700 sm:dark:text-surface-300"
            >
              {{ t('loginView.passwordLabel') }}
            </label>
            <div class="relative">
              <InputText
                id="login-password"
                v-model="password"
                data-testid="password-input"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                class="w-full pr-10"
                :disabled="loading"
              />
              <button
                type="button"
                tabindex="-1"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 transition-colors"
                @click="showPassword = !showPassword"
              >
                <i
                  :class="showPassword ? 'pi pi-eye-slash' : 'pi pi-eye'"
                  class="text-sm"
                />
              </button>
            </div>
          </div>

          <Transition name="error-fade">
            <p
              v-if="errorMessage"
              data-testid="error-message"
              class="text-sm text-red-300 sm:text-red-600 sm:dark:text-red-400 text-center -mb-1"
            >
              <i class="pi pi-exclamation-circle mr-1" />{{ errorMessage }}
            </p>
          </Transition>

          <Button
            type="submit"
            :label="t('loginView.submitButton')"
            data-testid="submit-button"
            :loading="loading"
            class="w-full"
          />
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.error-fade-enter-active,
.error-fade-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.error-fade-enter-from,
.error-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (max-width: 639px) {
  :deep([data-testid='submit-button']) {
    --p-button-primary-background: #e5e7eb;
    --p-button-primary-hover-background: #f3f4f6;
    --p-button-primary-active-background: #d1d5db;
    --p-button-primary-border-color: #e5e7eb;
    --p-button-primary-hover-border-color: #f3f4f6;
    --p-button-primary-active-border-color: #d1d5db;
    --p-button-primary-color: #374151;
    --p-button-primary-hover-color: #374151;
    --p-button-primary-active-color: #1f2937;
  }
}
</style>
