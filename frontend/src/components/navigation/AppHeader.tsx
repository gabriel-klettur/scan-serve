import { motion } from 'framer-motion';
import { CreditCard, History, RefreshCw, Scan, Settings } from 'lucide-react';
import type { ReactNode } from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useOCRStore } from '@/store/ocrStore';

type AppHeaderProps = {
  rightContent?: ReactNode;
};

type NavItem = {
  to: string;
  label: string;
  icon?: typeof Scan;
  end?: boolean;
};

const navItems: NavItem[] = [
  { to: '/', label: 'Home', icon: Scan, end: true },
  { to: '/results', label: 'Results' },
  { to: '/receipts', label: 'History', icon: History },
  { to: '/pricing', label: 'Pricing', icon: CreditCard },
];

export const AppHeader = ({ rightContent }: AppHeaderProps) => {
  const navigate = useNavigate();
  const { originalImage, result, reset } = useOCRStore();
  const canStartNewScan = Boolean(originalImage || result);

  const handleNewScan = () => {
    reset();
    navigate('/');
  };

  return (
    <header className="relative border-b border-border bg-card/50 backdrop-blur-xl">
      <div
        className={cn(
          'w-full h-16 flex items-center justify-between',
          'px-4 sm:px-6 lg:px-8',
        )}
      >
        <div className="flex items-center gap-6 min-w-0">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
              <Scan className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">ReceiptVision</h1>
              <p className="text-xs text-muted-foreground">AI-Powered OCR</p>
            </div>
          </motion.div>

          {canStartNewScan && (
            <Button
              variant="icon"
              size="icon"
              onClick={handleNewScan}
              title="New Scan"
              aria-label="New Scan"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          )}

          <motion.nav
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="hidden sm:flex items-center gap-2"
            aria-label="Primary"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'relative inline-flex items-center gap-2 h-10 px-4 rounded-lg text-sm font-medium transition-all duration-200 border',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background',
                      isActive
                        ? 'border-primary/50 bg-primary/10 text-foreground shadow-glow'
                        : 'border-border bg-transparent text-muted-foreground hover:bg-secondary/50 hover:text-foreground',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {Icon && <Icon className={cn('w-4 h-4', isActive ? 'text-primary' : 'text-muted-foreground')} />}
                      <span>{item.label}</span>
                      {isActive && (
                        <span
                          aria-hidden
                          className="absolute -bottom-[7px] left-1/2 h-1 w-8 -translate-x-1/2 rounded-full bg-primary/70 shadow-glow"
                        />
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </motion.nav>
        </div>

        <div className="flex items-center justify-end gap-2 shrink-0">
          {rightContent}

          <Button asChild variant="icon" size="icon" title="Settings" aria-label="Settings">
            <Link to="/settings">
              <Settings className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
};
