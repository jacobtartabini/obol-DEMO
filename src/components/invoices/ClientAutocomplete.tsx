import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { InvoiceClient } from '@/lib/invoiceHelpers';

interface ClientAutocompleteProps {
  clients: InvoiceClient[];
  name: string;
  email: string;
  address: string;
  onNameChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onAddressChange: (v: string) => void;
}

export function ClientAutocomplete({
  clients,
  name,
  email,
  address,
  onNameChange,
  onEmailChange,
  onAddressChange,
}: ClientAutocompleteProps) {
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = name.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => c.name.toLowerCase().includes(q));
  }, [clients, name]);

  function selectClient(c: InvoiceClient) {
    onNameChange(c.name);
    onEmailChange(c.email);
    onAddressChange(c.address);
    setOpen(false);
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">Bill to</Label>
      <div className="flex gap-2">
        <Input
          className="flex-1"
          placeholder="Client name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
        />
        {clients.length > 0 && (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" size="icon" className="shrink-0" title="Pick a past client">
                <ChevronsUpDown className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0" align="end">
              <Command>
                <CommandInput placeholder="Search clients…" />
                <CommandList>
                  <CommandEmpty>No matching clients.</CommandEmpty>
                  <CommandGroup>
                    {filtered.map((c) => (
                      <CommandItem
                        key={c.name}
                        value={c.name}
                        onSelect={() => selectClient(c)}
                      >
                        <Check className={cn('mr-2 h-4 w-4', name === c.name ? 'opacity-100' : 'opacity-0')} />
                        <div className="min-w-0">
                          <div className="truncate font-medium">{c.name}</div>
                          {c.email && <div className="truncate text-xs text-muted-foreground">{c.email}</div>}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}
      </div>
      <Input placeholder="Client email" value={email} onChange={(e) => onEmailChange(e.target.value)} />
      <Textarea rows={2} placeholder="Client address" value={address} onChange={(e) => onAddressChange(e.target.value)} />
    </div>
  );
}
