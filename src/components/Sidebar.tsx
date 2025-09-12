import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Collapse,
  IconButton,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  LayoutDashboard as DashboardIcon,
  BarChart as ReportsIcon,
  Users as BeneficiariasIcon,
  Folder as ProjectsIcon,
  FileText as FormsIcon,
  Bell as NotificationsIcon,
  Settings as SettingsIcon,
  ChevronUp as ExpandLess,
  ChevronDown as ExpandMore,
  Menu as MenuIcon
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const DRAWER_WIDTH = 240;

export default function Sidebar() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const isSelected = (path: string) => location.pathname === path;

  const menuItems = [
    {
      icon: <DashboardIcon />,
      text: 'Dashboard',
      path: '/dashboard',
      roles: ['admin', 'coordinator']
    },
    {
      icon: <BeneficiariasIcon />,
      text: 'Beneficiárias',
      path: '/beneficiarias'
    },
    {
      icon: <FormsIcon />,
      text: 'Oficinas',
      path: '/oficinas'
    },
    {
      icon: <NotificationsIcon />,
      text: 'Feed',
      path: '/feed'
    },
    {
      icon: <ProjectsIcon />,
      text: 'Projetos',
      path: '/projetos'
    },
    {
      icon: <ReportsIcon />,
      text: 'Relatórios',
      path: '/relatorios',
      roles: ['admin', 'coordinator']
    },
    {
      icon: <NotificationsIcon />,
      text: 'Notificações',
      path: '/notifications/settings'
    },
    {
      icon: <SettingsIcon />,
      text: 'Configurações',
      path: '/settings',
      roles: ['admin']
    }
  ];

  const drawer = (
    <Box>
      <List>
        {menuItems.map((item) => {
          // Verificar permissões
          if (item.roles && !item.roles.includes((user as any)?.papel || (user as any)?.role)) {
            return null;
          }

          // Itens simples
          return (
            <ListItem
              key={item.text}
              disablePadding
            >
              <ListItemButton
                selected={isSelected(item.path)}
                onClick={() => {
                  navigate(item.path);
                  if (isMobile) setMobileOpen(false);
                }}
                data-testid={
                  item.path === '/dashboard' ? 'menu-dashboard'
                  : item.path === '/beneficiarias' ? 'menu-beneficiarias'
                  : item.path === '/oficinas' ? 'menu-oficinas'
                  : item.path === '/projetos' ? 'menu-projetos'
                  : item.path === '/feed' ? 'menu-feed'
                  : item.path === '/relatorios' ? 'menu-relatorios'
                  : undefined
                }
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Box>
  );

  return (
    <Box
      component="nav"
      sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
    >
      {isMobile && (
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={handleDrawerToggle}
          sx={{ mr: 2, display: { md: 'none' } }}
          data-testid="mobile-menu-toggle"
        >
          <MenuIcon />
        </IconButton>
      )}
      
      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true // Better open performance on mobile.
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH }
        }}
        data-testid="mobile-navigation"
      >
        {drawer}
      </Drawer>
      
      {/* Desktop drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH }
        }}
        open
        data-testid="desktop-sidebar"
      >
        {drawer}
      </Drawer>
    </Box>
  );
}
