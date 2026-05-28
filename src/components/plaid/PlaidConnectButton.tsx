import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Link2 } from 'lucide-react';
import { toast } from 'sonner';

interface PlaidConnectButtonProps {
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  label?: string;
  onSuccess?: () => void;
}

export function PlaidConnectButton({
  variant = 'outline',
  size = 'default',
  label = 'Connect bank',
  onSuccess,
}: PlaidConnectButtonProps) {
  useEffect(() => {
    // Avoid silent confusion: Plaid is intentionally disabled in the static demo.
    void onSuccess;
  }, [onSuccess]);

  return (
    <Button
      variant={variant}
      size={size}
      onClick={() => toast.message('Plaid is disabled in the static demo.')}
    >
      <Link2 className="h-4 w-4" />
      {label}
    </Button>
  );
}
