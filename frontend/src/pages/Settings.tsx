/**
 * Settings page with sub-tabs for Credentials, Executions, and About
 */

import { useState } from 'react';
import {
  Box,
  Typography,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
} from '@mui/material';
import {
  Key as CredentialsIcon,
  History as ExecutionsIcon,
  Info as AboutIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { Credentials } from './Credentials';
import { Executions } from './Executions';
import { About } from './About';

type SettingsTab = 'credentials' | 'executions' | 'about';

const settingsTabs: { id: SettingsTab; label: string; icon: React.ReactNode; description: string }[] = [
  { id: 'credentials', label: 'Gateway Credentials', icon: <CredentialsIcon />, description: 'Manage saved gateway credentials' },
  { id: 'executions', label: 'Execution History', icon: <ExecutionsIcon />, description: 'View past playbook executions' },
  { id: 'about', label: 'About', icon: <AboutIcon />, description: 'Application information' },
];

export function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('credentials');

  return (
    <Box sx={{ height: 'calc(100vh - 88px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <SettingsIcon sx={{ color: 'text.secondary' }} />
        <Typography variant="h5" fontWeight="bold">
          Settings
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 3, flex: 1, minHeight: 0 }}>
        {/* Sidebar */}
        <Paper
          elevation={0}
          sx={{
            width: 240,
            flexShrink: 0,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
          }}
        >
          <List sx={{ p: 1 }}>
            {settingsTabs.map((tab) => (
              <ListItemButton
                key={tab.id}
                selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                sx={{
                  borderRadius: 1,
                  mb: 0.5,
                  '&.Mui-selected': {
                    bgcolor: 'action.selected',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: activeTab === tab.id ? 'primary.main' : 'text.secondary' }}>
                  {tab.icon}
                </ListItemIcon>
                <ListItemText
                  primary={tab.label}
                  primaryTypographyProps={{
                    fontSize: '0.875rem',
                    fontWeight: activeTab === tab.id ? 600 : 400,
                  }}
                />
              </ListItemButton>
            ))}
          </List>
        </Paper>

        {/* Content */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {activeTab === 'credentials' && <Credentials />}
          {activeTab === 'executions' && <Executions />}
          {activeTab === 'about' && <About />}
        </Box>
      </Box>
    </Box>
  );
}
