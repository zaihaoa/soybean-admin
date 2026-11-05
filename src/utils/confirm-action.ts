import { useDialog } from 'naive-ui';
import type { DialogProviderInst } from 'naive-ui';
import { $t } from '@/locales';
import { usePageOverlayContext } from '@/hooks/common/page-overlay';

interface ConfirmActionOptions {
  title: string;
  content: string;
  onConfirm?: () => void | Promise<void>;
}

export function useConfirmAction(): (options: ConfirmActionOptions) => void {
  const overlay = usePageOverlayContext();
  const defaultDialog = useDialog();

  return options => {
    const provider = overlay ? overlay.dialogs.value : defaultDialog;
    if (provider) confirmAction(options, provider, Boolean(overlay));
  };
}

export function confirmAction(
  { title, content, onConfirm }: ConfirmActionOptions,
  provider: DialogProviderInst,
  pageScoped = false
): void {
  const dialog = provider.warning({
    title,
    content,
    style: { width: '448px', maxWidth: 'calc(100% - 32px)' },
    blockScroll: !pageScoped,
    transformOrigin: 'center',
    positiveText: $t('common.confirm'),
    negativeText: onConfirm ? $t('common.cancel') : undefined,
    maskClosable: false,
    onPositiveClick: async () => {
      if (!onConfirm) return true;
      if (dialog.loading) return false;

      dialog.loading = true;
      dialog.closable = false;
      dialog.closeOnEsc = false;
      dialog.negativeButtonProps = { disabled: true };

      try {
        await onConfirm();
        return true;
      } catch {
        window.$message?.error($t('common.error'));
        return false;
      } finally {
        dialog.loading = false;
        dialog.closable = true;
        dialog.closeOnEsc = true;
        dialog.negativeButtonProps = undefined;
      }
    }
  });
}
