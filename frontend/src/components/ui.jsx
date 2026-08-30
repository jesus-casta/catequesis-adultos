import { createContext, cloneElement, useContext, useState } from 'react'
import { Menu } from 'lucide-react'
import { Toaster as SonnerToaster } from 'sonner'

const classes = (...values) => values.filter(Boolean).join(' ')

export function Button({ asChild, variant = 'default', size = 'default', className, children, ...props }) {
  const buttonClass = classes('button', `button-${variant}`, `button-${size}`, className)
  if (asChild) return cloneElement(children, { ...props, className: classes(buttonClass, children.props.className) })
  return <button className={buttonClass} {...props}>{children}</button>
}
export const Input = ({ className, ...props }) => <input className={classes('input', className)} {...props} />
export const Label = ({ className, ...props }) => <label className={classes('label', className)} {...props} />
export const Badge = ({ className, ...props }) => <span className={classes('badge', className)} {...props} />
export const Checkbox = ({ checked, onCheckedChange, ...props }) => <input type="checkbox" checked={checked} onChange={event => onCheckedChange?.(event.target.checked)} {...props} />

const DialogContext = createContext(() => {})
export function Dialog({ open, onOpenChange, children }) {
  return open ? <DialogContext.Provider value={onOpenChange}><div className="dialog-overlay">{children}</div></DialogContext.Provider> : null
}
export const DialogContent = ({ className, children }) => <section className={classes('dialog-content', className)} role="dialog" aria-modal="true">{children}</section>
export const DialogHeader = props => <header className="dialog-header" {...props} />
export const DialogTitle = props => <h2 {...props} />
export const DialogDescription = props => <p className="muted" {...props} />
export function DialogClose({ asChild, children }) {
  const close = useContext(DialogContext)
  return asChild ? cloneElement(children, { onClick: () => close(false) }) : <button type="button" onClick={() => close(false)}>{children}</button>
}

const TabsContext = createContext(null)
export function Tabs({ defaultValue, className, children }) {
  const [value, setValue] = useState(defaultValue)
  return <TabsContext.Provider value={{ value, setValue }}><div className={className}>{children}</div></TabsContext.Provider>
}
export const TabsList = ({ className, ...props }) => <div className={classes('tabs-list', className)} role="tablist" {...props} />
export function TabsTrigger({ value, className, children }) {
  const tabs = useContext(TabsContext)
  return <button type="button" role="tab" aria-selected={tabs.value === value} className={classes('tabs-trigger', tabs.value === value && 'active', className)} onClick={() => tabs.setValue(value)}>{children}</button>
}
export function TabsContent({ value, className, children }) {
  const tabs = useContext(TabsContext)
  return tabs.value === value ? <div className={classes('tabs-content', className)}>{children}</div> : null
}

export const Table = props => <div className="table-wrap"><table {...props} /></div>
export const TableHeader = props => <thead {...props} />
export const TableBody = props => <tbody {...props} />
export const TableRow = props => <tr {...props} />
export const TableHead = ({ className, ...props }) => <th className={className} {...props} />
export const TableCell = ({ className, ...props }) => <td className={className} {...props} />

const SidebarContext = createContext({ setOpenMobile() {} })
export function SidebarProvider({ children }) {
  const [open, setOpen] = useState(false)
  return <SidebarContext.Provider value={{ setOpenMobile: setOpen }}><div className={classes('sidebar-shell', open && 'sidebar-open')}>{children}</div></SidebarContext.Provider>
}
export const useSidebar = () => useContext(SidebarContext)
export const Sidebar = ({ className, ...props }) => <aside className={className} {...props} />
export const SidebarHeader = props => <header {...props} />
export const SidebarContent = props => <div {...props} />
export const SidebarFooter = props => <footer {...props} />
export const SidebarGroup = props => <nav {...props} />
export const SidebarGroupLabel = props => <p {...props} />
export const SidebarMenu = props => <ul {...props} />
export const SidebarMenuItem = props => <li {...props} />
export const SidebarMenuButton = ({ isActive, className, ...props }) => <button type="button" className={classes(className, isActive && 'active')} {...props} />
export const SidebarInset = ({ className, ...props }) => <div className={className} {...props} />
export function SidebarTrigger(props) {
  const sidebar = useContext(SidebarContext)
  return <button type="button" className="sidebar-trigger" onClick={() => sidebar.setOpenMobile(value => !value)} {...props}><Menu size={20} /></button>
}
export const Skeleton = ({ className }) => <div className={classes('skeleton', className)} />
export const Empty = ({ className, ...props }) => <div className={className} {...props} />
export const EmptyHeader = props => <div {...props} />
export const EmptyTitle = props => <h3 {...props} />
export const EmptyDescription = props => <p {...props} />
export const EmptyMedia = props => <div {...props} />
export const Toaster = props => <SonnerToaster {...props} />
