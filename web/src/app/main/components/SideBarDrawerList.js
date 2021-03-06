import React from 'react'
import { PropTypes as p } from 'prop-types'
import Divider from '@material-ui/core/Divider'
import List from '@material-ui/core/List'
import ListItem from '@material-ui/core/ListItem'
import ListItemText from '@material-ui/core/ListItemText'
import Typography from '@material-ui/core/Typography'
import withStyles from '@material-ui/core/styles/withStyles'
import { styles as globalStyles } from '../../styles/materialStyles'
import {
  Build as WizardIcon,
  Feedback as FeedbackIcon,
  Group as UsersIcon,
  Layers as EscalationPoliciesIcon,
  Notifications as AlertsIcon,
  PowerSettingsNew as LogoutIcon,
  RotateRight as RotationsIcon,
  Today as SchedulesIcon,
  VpnKey as ServicesIcon,
  Settings as AdminIcon,
} from '@material-ui/icons'

import routeConfig, { getPath } from '../routes'

import { Link, NavLink } from 'react-router-dom'
import ListItemIcon from '@material-ui/core/ListItemIcon'
import { CurrentUserAvatar } from '../../util/avatar'
import { authLogout } from '../../actions'
import { connect } from 'react-redux'
import RequireConfig, { Config } from '../../util/RequireConfig'

const navIcons = {
  Alerts: AlertsIcon,
  Rotations: RotationsIcon,
  Schedules: SchedulesIcon,
  'Escalation Policies': EscalationPoliciesIcon,
  Services: ServicesIcon,
  Users: UsersIcon,
  Admin: AdminIcon,
}

const styles = theme => ({
  ...globalStyles(theme),
  logoDiv: {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
  },
  logo: {
    padding: '0.5em',
  },
  navSelected: {
    backgroundColor: '#ebebeb',
    borderRight: '3px solid ' + theme.palette.primary['500'],
  },
  navIcon: {
    width: '1em',
    height: '1em',
    fontSize: '24px',
  },
  list: {
    color: theme.palette.primary['500'],
    padding: 0,
  },
  listItemText: {
    color: theme.palette.primary['500'],
  },
})

const mapDispatchToProps = dispatch => {
  return {
    logout: () => dispatch(authLogout(true)),
  }
}

@withStyles(styles, { withTheme: true })
@connect(
  null,
  mapDispatchToProps,
)
export default class SideBarDrawerList extends React.PureComponent {
  static propTypes = {
    onWizard: p.func.isRequired,
    classes: p.object.isRequired,
  }

  renderSidebarLink = (icon, path, label, props = {}) => {
    return (
      <Link to={path} className={this.props.classes.nav} {...props}>
        {this.renderSidebarItem(icon, label)}
      </Link>
    )
  }

  renderSidebarNavLink = (icon, path, label, key) => {
    return (
      <NavLink
        key={key}
        to={path}
        className={this.props.classes.nav}
        activeClassName={this.props.classes.navSelected}
      >
        {this.renderSidebarItem(icon, label)}
      </NavLink>
    )
  }

  renderSidebarItem = (IconComponent, label) => {
    return (
      <ListItem button tabIndex={-1}>
        <ListItemIcon>
          <IconComponent className={this.props.classes.navIcon} />
        </ListItemIcon>
        <ListItemText
          disableTypography
          primary={
            <Typography
              variant='subtitle1'
              className={this.props.classes.listItemText}
            >
              {label}
            </Typography>
          }
        />
      </ListItem>
    )
  }

  renderAdmin() {
    const cfg = routeConfig.find(c => c.title === 'Admin')

    return this.renderSidebarNavLink(
      navIcons[cfg.title],
      getPath(cfg),
      cfg.title,
      null,
    )
  }

  renderFeedback(url) {
    return (
      <a
        href={url}
        className={this.props.classes.nav}
        target='_blank'
        data-cy='feedback-link'
      >
        {this.renderSidebarItem(FeedbackIcon, 'Feedback')}
      </a>
    )
  }

  render() {
    const { classes } = this.props

    return (
      <List className={classes.list} data-cy='nav-list'>
        <div className={classes.logoDiv}>
          <img
            className={classes.logo}
            height={32}
            src={require('../../public/goalert-alt-logo-scaled.png')}
          />
        </div>
        <Divider />

        {routeConfig
          .filter(cfg => cfg.nav !== false)
          .map((cfg, idx) =>
            this.renderSidebarNavLink(
              navIcons[cfg.title],
              getPath(cfg),
              cfg.title,
              idx,
            ),
          )}

        <RequireConfig isAdmin>
          <Divider />
          {this.renderAdmin()}
        </RequireConfig>

        <Divider />
        {this.renderSidebarNavLink(WizardIcon, '/wizard', 'Wizard')}
        <Config>
          {cfg =>
            cfg['Feedback.Enable'] &&
            this.renderFeedback(
              cfg['Feedback.OverrideURL'] ||
                'https://www.surveygizmo.com/s3/4106900/GoAlert-Feedback',
            )
          }
        </Config>
        {this.renderSidebarLink(
          LogoutIcon,
          '/api/v2/identity/logout',
          'Logout',
          {
            onClick: e => {
              e.preventDefault()
              this.props.logout()
            },
          },
        )}
        {this.renderSidebarNavLink(CurrentUserAvatar, '/profile', 'Profile')}
      </List>
    )
  }
}
