import { computed, inject, provide, shallowRef } from 'vue';
import type { InjectionKey, ShallowRef } from 'vue';
import { useRoute } from 'vue-router';
import type { DialogProviderInst } from 'naive-ui';
import { getTabIdByRoute } from '@/store/modules/tab/shared';

interface PageOverlay {
  target: ShallowRef<HTMLElement | undefined>;
  dialogs: ShallowRef<DialogProviderInst | undefined>;
}

const pageOverlayKey: InjectionKey<PageOverlay> = Symbol('page-overlay');

export function providePageOverlay(): PageOverlay {
  const target = shallowRef<HTMLElement>();
  const dialogs = shallowRef<DialogProviderInst>();
  const overlay = { target, dialogs };
  provide(pageOverlayKey, overlay);
  return overlay;
}

export function usePageOverlayContext(): PageOverlay | undefined {
  return inject(pageOverlayKey, undefined);
}

export function usePageOverlay() {
  const overlay = usePageOverlayContext();
  const route = useRoute();
  const tabId = computed(() => getTabIdByRoute(route));
  const ownerId = tabId.value;
  const overlayActive = computed(() => !overlay || tabId.value === ownerId);
  const overlayProps = computed(() => ({
    to: overlay?.target.value,
    blockScroll: !overlay
  }));

  return { tabId, overlayActive, overlayProps };
}
