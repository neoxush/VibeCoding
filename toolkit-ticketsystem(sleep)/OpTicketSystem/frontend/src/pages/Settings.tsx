import { useState } from 'react'
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Grid,
  TextField,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  )
}

// Mock data - will be replaced with API calls
const mockStatuses = [
  { id: '1', name: 'Open', color: '#f44336', order: 1 },
  { id: '2', name: 'In Progress', color: '#ff9800', order: 2 },
  { id: '3', name: 'Resolved', color: '#4caf50', order: 3 },
  { id: '4', name: 'Closed', color: '#9e9e9e', order: 4 },
]

const mockCustomFields = [
  { id: '1', name: 'Department', type: 'select', options: 'IT,HR,Finance,Marketing', required: true },
  { id: '2', name: 'Due Date', type: 'date', options: '', required: false },
  { id: '3', name: 'Impact', type: 'select', options: 'Low,Medium,High', required: true },
]

const fieldTypes = [
  { id: 'text', name: 'Text' },
  { id: 'textarea', name: 'Text Area' },
  { id: 'number', name: 'Number' },
  { id: 'date', name: 'Date' },
  { id: 'select', name: 'Select' },
  { id: 'checkbox', name: 'Checkbox' },
]

const Settings = () => {
  const [tabValue, setTabValue] = useState(0)
  const [statuses, setStatuses] = useState(mockStatuses)
  const [customFields, setCustomFields] = useState(mockCustomFields)
  const [openStatusDialog, setOpenStatusDialog] = useState(false)
  const [openFieldDialog, setOpenFieldDialog] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [statusForm, setStatusForm] = useState({
    name: '',
    color: '#1976d2',
  })
  const [fieldForm, setFieldForm] = useState({
    name: '',
    type: 'text',
    options: '',
    required: false,
  })

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  // Status Dialog Handlers
  const handleOpenStatusDialog = (status: any = null) => {
    if (status) {
      setEditItem(status)
      setStatusForm({
        name: status.name,
        color: status.color,
      })
    } else {
      setEditItem(null)
      setStatusForm({
        name: '',
        color: '#1976d2',
      })
    }
    setOpenStatusDialog(true)
  }

  const handleCloseStatusDialog = () => {
    setOpenStatusDialog(false)
  }

  const handleStatusInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setStatusForm({
      ...statusForm,
      [name]: value,
    })
  }

  const handleStatusSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    
    if (editItem && tabValue === 0) {
      // Update existing status
      const updatedStatuses = statuses.map((status) =>
        status.id === editItem.id
          ? { ...status, name: statusForm.name, color: statusForm.color }
          : status
      )
      setStatuses(updatedStatuses)
    } else {
      // Create new status
      const newStatus = {
        id: `temp-${Date.now()}`,
        name: statusForm.name,
        color: statusForm.color,
        order: statuses.length + 1,
      }
      setStatuses([...statuses, newStatus])
    }
    
    handleCloseStatusDialog()
  }

  const handleDeleteStatus = (id: string) => {
    const updatedStatuses = statuses.filter((status) => status.id !== id)
    setStatuses(updatedStatuses)
  }

  const handleMoveStatus = (id: string, direction: 'up' | 'down') => {
    const index = statuses.findIndex((status) => status.id === id)
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === statuses.length - 1)
    ) {
      return
    }

    const newIndex = direction === 'up' ? index - 1 : index + 1
    const updatedStatuses = [...statuses]
    const temp = updatedStatuses[index]
    updatedStatuses[index] = updatedStatuses[newIndex]
    updatedStatuses[newIndex] = temp

    // Update order property
    updatedStatuses.forEach((status, i) => {
      status.order = i + 1
    })

    setStatuses(updatedStatuses)
  }

  // Custom Field Dialog Handlers
  const handleOpenFieldDialog = (field: any = null) => {
    if (field) {
      setEditItem(field)
      setFieldForm({
        name: field.name,
        type: field.type,
        options: field.options,
        required: field.required,
      })
    } else {
      setEditItem(null)
      setFieldForm({
        name: '',
        type: 'text',
        options: '',
        required: false,
      })
    }
    setOpenFieldDialog(true)
  }

  const handleCloseFieldDialog = () => {
    setOpenFieldDialog(false)
  }

  const handleFieldInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setFieldForm({
      ...fieldForm,
      [name]: value,
    })
  }

  const handleFieldSelectChange = (event: any) => {
    setFieldForm({
      ...fieldForm,
      type: event.target.value,
    })
  }

  const handleFieldSwitchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFieldForm({
      ...fieldForm,
      required: event.target.checked,
    })
  }

  const handleFieldSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    
    if (editItem && tabValue === 1) {
      // Update existing field
      const updatedFields = customFields.map((field) =>
        field.id === editItem.id
          ? {
              ...field,
              name: fieldForm.name,
              type: fieldForm.type,
              options: fieldForm.options,
              required: fieldForm.required,
            }
          : field
      )
      setCustomFields(updatedFields)
    } else {
      // Create new field
      const newField = {
        id: `temp-${Date.now()}`,
        name: fieldForm.name,
        type: fieldForm.type,
        options: fieldForm.options,
        required: fieldForm.required,
      }
      setCustomFields([...customFields, newField])
    }
    
    handleCloseFieldDialog()
  }

  const handleDeleteField = (id: string) => {
    const updatedFields = customFields.filter((field) => field.id !== id)
    setCustomFields(updatedFields)
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>

      <Paper sx={{ width: '100%' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label="Ticket Statuses" />
          <Tab label="Custom Fields" />
          <Tab label="General Settings" />
        </Tabs>

        {/* Ticket Statuses Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Ticket Statuses</Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => handleOpenStatusDialog()}
            >
              Add Status
            </Button>
          </Box>
          <Divider sx={{ mb: 2 }} />
          <List>
            {statuses.map((status) => (
              <ListItem key={status.id} divider>
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    bgcolor: status.color,
                    mr: 2,
                  }}
                />
                <ListItemText
                  primary={status.name}
                  secondary={`Order: ${status.order}`}
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    aria-label="move up"
                    onClick={() => handleMoveStatus(status.id, 'up')}
                    disabled={status.order === 1}
                  >
                    <ArrowUpwardIcon />
                  </IconButton>
                  <IconButton
                    edge="end"
                    aria-label="move down"
                    onClick={() => handleMoveStatus(status.id, 'down')}
                    disabled={status.order === statuses.length}
                  >
                    <ArrowDownwardIcon />
                  </IconButton>
                  <IconButton
                    edge="end"
                    aria-label="edit"
                    onClick={() => handleOpenStatusDialog(status)}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    edge="end"
                    aria-label="delete"
                    onClick={() => handleDeleteStatus(status.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </TabPanel>

        {/* Custom Fields Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Custom Fields</Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => handleOpenFieldDialog()}
            >
              Add Field
            </Button>
          </Box>
          <Divider sx={{ mb: 2 }} />
          <List>
            {customFields.map((field) => (
              <ListItem key={field.id} divider>
                <ListItemText
                  primary={field.name}
                  secondary={`Type: ${field.type}${
                    field.required ? ' (Required)' : ''
                  }${
                    field.options ? ` | Options: ${field.options}` : ''
                  }`}
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    aria-label="edit"
                    onClick={() => handleOpenFieldDialog(field)}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    edge="end"
                    aria-label="delete"
                    onClick={() => handleDeleteField(field.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </TabPanel>

        {/* General Settings Tab */}
        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            General Settings
          </Typography>
          <Divider sx={{ mb: 3 }} />
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="System Name"
                defaultValue="OpTicket System"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Admin Email"
                defaultValue="admin@example.com"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={<Switch defaultChecked />}
                label="Allow user registration"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={<Switch defaultChecked />}
                label="Email notifications"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={<Switch />}
                label="Require approval for new tickets"
              />
            </Grid>
            <Grid item xs={12}>
              <Button variant="contained" color="primary">
                Save Settings
              </Button>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>

      {/* Status Dialog */}
      <Dialog open={openStatusDialog} onClose={handleCloseStatusDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editItem && tabValue === 0 ? 'Edit Status' : 'Add Status'}</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleStatusSubmit} sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  label="Status Name"
                  name="name"
                  value={statusForm.name}
                  onChange={handleStatusInputChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  label="Color"
                  name="color"
                  type="color"
                  value={statusForm.color}
                  onChange={handleStatusInputChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseStatusDialog}>Cancel</Button>
          <Button onClick={handleStatusSubmit} variant="contained" color="primary">
            {editItem && tabValue === 0 ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Custom Field Dialog */}
      <Dialog open={openFieldDialog} onClose={handleCloseFieldDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editItem && tabValue === 1 ? 'Edit Field' : 'Add Field'}</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleFieldSubmit} sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  label="Field Name"
                  name="name"
                  value={fieldForm.name}
                  onChange={handleFieldInputChange}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>Field Type</InputLabel>
                  <Select
                    value={fieldForm.type}
                    label="Field Type"
                    onChange={handleFieldSelectChange}
                  >
                    {fieldTypes.map((type) => (
                      <MenuItem key={type.id} value={type.id}>
                        {type.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              {fieldForm.type === 'select' && (
                <Grid item xs={12}>
                  <TextField
                    required
                    fullWidth
                    label="Options (comma separated)"
                    name="options"
                    value={fieldForm.options}
                    onChange={handleFieldInputChange}
                    helperText="Enter options separated by commas (e.g. Option 1,Option 2,Option 3)"
                  />
                </Grid>
              )}
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={fieldForm.required}
                      onChange={handleFieldSwitchChange}
                      name="required"
                    />
                  }
                  label="Required Field"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseFieldDialog}>Cancel</Button>
          <Button onClick={handleFieldSubmit} variant="contained" color="primary">
            {editItem && tabValue === 1 ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default Settings
