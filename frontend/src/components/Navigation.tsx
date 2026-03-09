import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Box,
  Button,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import TranslateIcon from '@mui/icons-material/Translate';
import HomeIcon from '@mui/icons-material/Home';
import PersonIcon from '@mui/icons-material/Person';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AssignmentIcon from '@mui/icons-material/Assignment';
import SecurityIcon from '@mui/icons-material/Security';
import SchoolIcon from '@mui/icons-material/School';
import { useNavigate } from 'react-router-dom';
import { Language } from '../types';
import { LANGUAGES } from '../config/api';
import { useTranslation } from '../hooks/useTranslation';

interface NavigationProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ language, onLanguageChange }) => {
  const navigate = useNavigate();
  const { t } = useTranslation(language);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [langMenuAnchor, setLangMenuAnchor] = useState<null | HTMLElement>(null);

  const menuItems = [
    { text: t.nav.home, icon: <HomeIcon />, path: '/' },
    { text: t.nav.profile, icon: <PersonIcon />, path: '/profile' },
    { text: t.nav.schemes, icon: <AccountBalanceIcon />, path: '/schemes' },
    // { text: t.nav.applications, icon: <AssignmentIcon />, path: '/applications' },
    { text: t.nav.fraudCheck, icon: <SecurityIcon />, path: '/fraud-check' },
    { text: t.nav.learnFinance, icon: <SchoolIcon />, path: '/education' },
  ];

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleLanguageMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setLangMenuAnchor(event.currentTarget);
  };

  const handleLanguageMenuClose = () => {
    setLangMenuAnchor(null);
  };

  const handleLanguageSelect = (lang: Language) => {
    onLanguageChange(lang);
    handleLanguageMenuClose();
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setDrawerOpen(false);
  };

  return (
    <>
      <AppBar position="fixed">
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {t.nav.appTitle}
          </Typography>

          <IconButton color="inherit" onClick={handleLanguageMenuOpen}>
            <TranslateIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Drawer anchor="left" open={drawerOpen} onClose={handleDrawerToggle}>
        <Box sx={{ width: 250 }} role="presentation">
          <List>
            {menuItems.map((item) => (
              <ListItem key={item.text} onClick={() => handleNavigation(item.path)} sx={{ cursor: 'pointer' }}>
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      <Menu
        anchorEl={langMenuAnchor}
        open={Boolean(langMenuAnchor)}
        onClose={handleLanguageMenuClose}
      >
        {Object.entries(LANGUAGES).map(([code, name]) => (
          <MenuItem
            key={code}
            onClick={() => handleLanguageSelect(code as Language)}
            selected={code === language}
          >
            {name}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};
