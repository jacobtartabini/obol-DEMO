import { useQuery } from '@tanstack/react-query';
import { useUserKey } from '@/providers/AuthProvider';
import { listAuditLog } from '@/lib/api';
import { PageContainer, PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/format';

export default function AuditLog() {
  const userKey = useUserKey();
  const { data: logs = [] } = useQuery({
    queryKey: ['audit', userKey],
    queryFn: () => listAuditLog(userKey!),
    enabled: !!userKey,
  });

  return (
    <PageContainer>
      <PageHeader title="Audit Log" description="Every mutation in your books, in chronological order." />
      <Card>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {logs.map((l) => (
              <li key={l.id} className="px-4 py-3 flex items-center gap-3">
                <Badge variant="outline" className="text-[10px] capitalize">{l.action}</Badge>
                <span className="text-sm font-medium capitalize">{l.entity_type}</span>
                <span className="text-xs text-muted-foreground font-mono truncate">{l.entity_id?.slice(0, 8)}</span>
                <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                  {formatDate(l.created_at)} · {new Date(l.created_at).toLocaleTimeString()}
                </span>
              </li>
            ))}
            {logs.length === 0 && <li className="p-8 text-center text-sm text-muted-foreground">No activity yet.</li>}
          </ul>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
