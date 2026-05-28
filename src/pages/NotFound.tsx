import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const NotFound = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center">
      <div className="text-6xl font-bold text-muted-foreground mb-2">404</div>
      <p className="text-muted-foreground mb-4">This page doesn&apos;t exist.</p>
      <Button asChild>
        <Link to="/">Back to dashboard</Link>
      </Button>
    </div>
  </div>
);

export default NotFound;
