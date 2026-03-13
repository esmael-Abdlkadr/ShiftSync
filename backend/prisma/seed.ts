import { PrismaClient, UserRole, DayOfWeek } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const managerPasswordHash = await bcrypt.hash('manager123', 10);
  const staffPasswordHash = await bcrypt.hash('staff123', 10);

  // Create Locations
  const locations = await Promise.all([
    prisma.location.upsert({
      where: { id: 'loc_downtown_sf' },
      update: {},
      create: {
        id: 'loc_downtown_sf',
        name: 'Downtown SF',
        address: '123 Market St, San Francisco, CA 94103',
        timezone: 'America/Los_Angeles',
      },
    }),
    prisma.location.upsert({
      where: { id: 'loc_marina_sf' },
      update: {},
      create: {
        id: 'loc_marina_sf',
        name: 'Marina SF',
        address: '456 Chestnut St, San Francisco, CA 94123',
        timezone: 'America/Los_Angeles',
      },
    }),
    prisma.location.upsert({
      where: { id: 'loc_midtown_nyc' },
      update: {},
      create: {
        id: 'loc_midtown_nyc',
        name: 'Midtown NYC',
        address: '789 5th Ave, New York, NY 10022',
        timezone: 'America/New_York',
      },
    }),
    prisma.location.upsert({
      where: { id: 'loc_brooklyn_nyc' },
      update: {},
      create: {
        id: 'loc_brooklyn_nyc',
        name: 'Brooklyn NYC',
        address: '321 Atlantic Ave, Brooklyn, NY 11201',
        timezone: 'America/New_York',
      },
    }),
  ]);

  console.log('Created locations:', locations.map(l => l.name).join(', '));

  // Create Skills
  const skills = await Promise.all([
    prisma.skill.upsert({
      where: { id: 'skill_server' },
      update: {},
      create: { id: 'skill_server', name: 'Server' },
    }),
    prisma.skill.upsert({
      where: { id: 'skill_bartender' },
      update: {},
      create: { id: 'skill_bartender', name: 'Bartender' },
    }),
    prisma.skill.upsert({
      where: { id: 'skill_line_cook' },
      update: {},
      create: { id: 'skill_line_cook', name: 'Line Cook' },
    }),
    prisma.skill.upsert({
      where: { id: 'skill_host' },
      update: {},
      create: { id: 'skill_host', name: 'Host' },
    }),
  ]);

  console.log('Created skills:', skills.map(s => s.name).join(', '));

  // Create Admins (2)
  const admins = await Promise.all([
    prisma.user.upsert({
      where: { email: 'admin@coastaleats.com' },
      update: { passwordHash: adminPasswordHash },
      create: {
        email: 'admin@coastaleats.com',
        passwordHash: adminPasswordHash,
        firstName: 'Alice',
        lastName: 'Admin',
        role: UserRole.ADMIN,
        timezone: 'America/Los_Angeles',
      },
    }),
    prisma.user.upsert({
      where: { email: 'admin2@coastaleats.com' },
      update: { passwordHash: adminPasswordHash },
      create: {
        email: 'admin2@coastaleats.com',
        passwordHash: adminPasswordHash,
        firstName: 'Bob',
        lastName: 'Admin',
        role: UserRole.ADMIN,
        timezone: 'America/New_York',
      },
    }),
  ]);

  console.log('Created admins:', admins.map(a => a.email).join(', '));

  // Create Managers (4)
  const managers = await Promise.all([
    prisma.user.upsert({
      where: { email: 'mike@coastaleats.com' },
      update: { passwordHash: managerPasswordHash },
      create: {
        email: 'mike@coastaleats.com',
        passwordHash: managerPasswordHash,
        firstName: 'Mike',
        lastName: 'Manager',
        role: UserRole.MANAGER,
        timezone: 'America/Los_Angeles',
      },
    }),
    prisma.user.upsert({
      where: { email: 'nina@coastaleats.com' },
      update: { passwordHash: managerPasswordHash },
      create: {
        email: 'nina@coastaleats.com',
        passwordHash: managerPasswordHash,
        firstName: 'Nina',
        lastName: 'Manager',
        role: UserRole.MANAGER,
        timezone: 'America/New_York',
      },
    }),
    prisma.user.upsert({
      where: { email: 'oscar@coastaleats.com' },
      update: { passwordHash: managerPasswordHash },
      create: {
        email: 'oscar@coastaleats.com',
        passwordHash: managerPasswordHash,
        firstName: 'Oscar',
        lastName: 'Manager',
        role: UserRole.MANAGER,
        timezone: 'America/New_York',
      },
    }),
    prisma.user.upsert({
      where: { email: 'pat@coastaleats.com' },
      update: { passwordHash: managerPasswordHash },
      create: {
        email: 'pat@coastaleats.com',
        passwordHash: managerPasswordHash,
        firstName: 'Pat',
        lastName: 'Manager',
        role: UserRole.MANAGER,
        timezone: 'America/Los_Angeles',
      },
    }),
  ]);

  console.log('Created managers:', managers.map(m => m.email).join(', '));

  // Assign managers to locations
  await Promise.all([
    // Mike manages Downtown SF and Marina SF
    prisma.locationManager.upsert({
      where: { userId_locationId: { userId: managers[0].id, locationId: 'loc_downtown_sf' } },
      update: {},
      create: { userId: managers[0].id, locationId: 'loc_downtown_sf' },
    }),
    prisma.locationManager.upsert({
      where: { userId_locationId: { userId: managers[0].id, locationId: 'loc_marina_sf' } },
      update: {},
      create: { userId: managers[0].id, locationId: 'loc_marina_sf' },
    }),
    // Nina manages Midtown NYC
    prisma.locationManager.upsert({
      where: { userId_locationId: { userId: managers[1].id, locationId: 'loc_midtown_nyc' } },
      update: {},
      create: { userId: managers[1].id, locationId: 'loc_midtown_nyc' },
    }),
    // Oscar manages Brooklyn NYC
    prisma.locationManager.upsert({
      where: { userId_locationId: { userId: managers[2].id, locationId: 'loc_brooklyn_nyc' } },
      update: {},
      create: { userId: managers[2].id, locationId: 'loc_brooklyn_nyc' },
    }),
    // Pat also manages Downtown SF (shared with Mike)
    prisma.locationManager.upsert({
      where: { userId_locationId: { userId: managers[3].id, locationId: 'loc_downtown_sf' } },
      update: {},
      create: { userId: managers[3].id, locationId: 'loc_downtown_sf' },
    }),
  ]);

  console.log('Assigned managers to locations');

  // Create Staff (16) with various edge cases
  const staffData = [
    { email: 'sarah@coastaleats.com', firstName: 'Sarah', lastName: 'Server', timezone: 'America/Los_Angeles', desiredWeeklyHours: 30 },
    { email: 'john@coastaleats.com', firstName: 'John', lastName: 'Bartender', timezone: 'America/Los_Angeles', desiredWeeklyHours: 40 },
    { email: 'maria@coastaleats.com', firstName: 'Maria', lastName: 'Cook', timezone: 'America/Los_Angeles', desiredWeeklyHours: 35 },
    { email: 'alex@coastaleats.com', firstName: 'Alex', lastName: 'Flex', timezone: 'America/Los_Angeles', desiredWeeklyHours: 40 },
    { email: 'lisa@coastaleats.com', firstName: 'Lisa', lastName: 'Weekend', timezone: 'America/Los_Angeles', desiredWeeklyHours: 20 },
    { email: 'tom@coastaleats.com', firstName: 'Tom', lastName: 'Overtime', timezone: 'America/Los_Angeles', desiredWeeklyHours: 45 },
    { email: 'emma@coastaleats.com', firstName: 'Emma', lastName: 'Part', timezone: 'America/New_York', desiredWeeklyHours: 15 },
    { email: 'chris@coastaleats.com', firstName: 'Chris', lastName: 'Cross', timezone: 'America/Los_Angeles', desiredWeeklyHours: 35 },
    { email: 'dana@coastaleats.com', firstName: 'Dana', lastName: 'Double', timezone: 'America/Los_Angeles', desiredWeeklyHours: 40 },
    { email: 'frank@coastaleats.com', firstName: 'Frank', lastName: 'Night', timezone: 'America/New_York', desiredWeeklyHours: 35 },
    { email: 'grace@coastaleats.com', firstName: 'Grace', lastName: 'New', timezone: 'America/New_York', desiredWeeklyHours: 25 },
    { email: 'henry@coastaleats.com', firstName: 'Henry', lastName: 'Host', timezone: 'America/New_York', desiredWeeklyHours: 30 },
    { email: 'ivy@coastaleats.com', firstName: 'Ivy', lastName: 'Irregular', timezone: 'America/Los_Angeles', desiredWeeklyHours: 20 },
    { email: 'jake@coastaleats.com', firstName: 'Jake', lastName: 'Junior', timezone: 'America/Los_Angeles', desiredWeeklyHours: 10 },
    { email: 'kate@coastaleats.com', firstName: 'Kate', lastName: 'Kitchen', timezone: 'America/New_York', desiredWeeklyHours: 38 },
    { email: 'leo@coastaleats.com', firstName: 'Leo', lastName: 'Limited', timezone: 'America/New_York', desiredWeeklyHours: 15 },
  ];

  const staff = await Promise.all(
    staffData.map(s =>
      prisma.user.upsert({
        where: { email: s.email },
        update: { passwordHash: staffPasswordHash },
        create: {
          email: s.email,
          passwordHash: staffPasswordHash,
          firstName: s.firstName,
          lastName: s.lastName,
          role: UserRole.STAFF,
          timezone: s.timezone,
          desiredWeeklyHours: s.desiredWeeklyHours,
        },
      })
    )
  );

  console.log('Created staff:', staff.length);

  // Helper to get staff by first name
  const getStaff = (firstName: string) => staff.find(s => s.firstName === firstName)!;

  // Assign Skills to Staff
  const skillAssignments = [
    { user: 'Sarah', skills: ['Server', 'Host'] },
    { user: 'John', skills: ['Bartender', 'Server'] },
    { user: 'Maria', skills: ['Line Cook'] },
    { user: 'Alex', skills: ['Server', 'Bartender', 'Host'] },
    { user: 'Lisa', skills: ['Server'] },
    { user: 'Tom', skills: ['Bartender'] },
    { user: 'Emma', skills: ['Host'] },
    { user: 'Chris', skills: ['Server'] },
    { user: 'Dana', skills: ['Line Cook'] },
    { user: 'Frank', skills: ['Bartender'] },
    { user: 'Grace', skills: ['Server'] },
    { user: 'Henry', skills: ['Host'] },
    { user: 'Ivy', skills: ['Server'] },
    { user: 'Jake', skills: ['Host'] },
    { user: 'Kate', skills: ['Line Cook'] },
    { user: 'Leo', skills: ['Bartender'] },
  ];

  const getSkill = (name: string) => skills.find(s => s.name === name)!;

  for (const assignment of skillAssignments) {
    const user = getStaff(assignment.user);
    for (const skillName of assignment.skills) {
      const skill = getSkill(skillName);
      await prisma.userSkill.upsert({
        where: { userId_skillId: { userId: user.id, skillId: skill.id } },
        update: {},
        create: { userId: user.id, skillId: skill.id },
      });
    }
  }

  console.log('Assigned skills to staff');

  // Location Certifications
  const certifications = [
    { user: 'Sarah', locations: ['loc_downtown_sf'] },
    { user: 'John', locations: ['loc_downtown_sf', 'loc_marina_sf'] },
    { user: 'Maria', locations: ['loc_downtown_sf'] },
    { user: 'Alex', locations: ['loc_downtown_sf', 'loc_marina_sf', 'loc_midtown_nyc', 'loc_brooklyn_nyc'] },
    { user: 'Lisa', locations: ['loc_marina_sf'] },
    { user: 'Tom', locations: ['loc_downtown_sf'] },
    { user: 'Emma', locations: ['loc_midtown_nyc'] },
    { user: 'Chris', locations: ['loc_downtown_sf', 'loc_midtown_nyc'] },
    { user: 'Dana', locations: ['loc_marina_sf'] },
    { user: 'Frank', locations: ['loc_brooklyn_nyc'] },
    { user: 'Grace', locations: ['loc_brooklyn_nyc'] },
    { user: 'Henry', locations: ['loc_midtown_nyc', 'loc_brooklyn_nyc'] },
    { user: 'Ivy', locations: ['loc_marina_sf'] },
    { user: 'Jake', locations: ['loc_downtown_sf'] },
    { user: 'Kate', locations: ['loc_midtown_nyc'] },
    { user: 'Leo', locations: ['loc_brooklyn_nyc'] },
  ];

  for (const cert of certifications) {
    const user = getStaff(cert.user);
    for (const locationId of cert.locations) {
      await prisma.userLocationCertification.upsert({
        where: { userId_locationId: { userId: user.id, locationId } },
        update: {},
        create: { userId: user.id, locationId },
      });
    }
  }

  console.log('Assigned location certifications');

  // Availability patterns
  const availabilityPatterns: { user: string; days: { day: DayOfWeek; start: string; end: string }[] }[] = [
    { user: 'Sarah', days: [
      { day: DayOfWeek.MONDAY, start: '09:00', end: '17:00' },
      { day: DayOfWeek.TUESDAY, start: '09:00', end: '17:00' },
      { day: DayOfWeek.WEDNESDAY, start: '09:00', end: '17:00' },
      { day: DayOfWeek.THURSDAY, start: '09:00', end: '17:00' },
      { day: DayOfWeek.FRIDAY, start: '09:00', end: '17:00' },
    ]},
    { user: 'John', days: [
      { day: DayOfWeek.MONDAY, start: '16:00', end: '00:00' },
      { day: DayOfWeek.TUESDAY, start: '16:00', end: '00:00' },
      { day: DayOfWeek.WEDNESDAY, start: '16:00', end: '00:00' },
      { day: DayOfWeek.THURSDAY, start: '16:00', end: '00:00' },
      { day: DayOfWeek.FRIDAY, start: '16:00', end: '00:00' },
      { day: DayOfWeek.SATURDAY, start: '16:00', end: '00:00' },
      { day: DayOfWeek.SUNDAY, start: '16:00', end: '00:00' },
    ]},
    { user: 'Maria', days: [
      { day: DayOfWeek.TUESDAY, start: '06:00', end: '16:00' },
      { day: DayOfWeek.WEDNESDAY, start: '06:00', end: '16:00' },
      { day: DayOfWeek.THURSDAY, start: '06:00', end: '16:00' },
      { day: DayOfWeek.FRIDAY, start: '06:00', end: '16:00' },
      { day: DayOfWeek.SATURDAY, start: '06:00', end: '16:00' },
    ]},
    { user: 'Alex', days: [
      { day: DayOfWeek.MONDAY, start: '08:00', end: '20:00' },
      { day: DayOfWeek.TUESDAY, start: '08:00', end: '20:00' },
      { day: DayOfWeek.WEDNESDAY, start: '08:00', end: '20:00' },
      { day: DayOfWeek.THURSDAY, start: '08:00', end: '20:00' },
      { day: DayOfWeek.FRIDAY, start: '08:00', end: '20:00' },
      { day: DayOfWeek.SATURDAY, start: '08:00', end: '20:00' },
      { day: DayOfWeek.SUNDAY, start: '08:00', end: '20:00' },
    ]},
    { user: 'Lisa', days: [
      { day: DayOfWeek.FRIDAY, start: '09:00', end: '21:00' },
      { day: DayOfWeek.SATURDAY, start: '09:00', end: '21:00' },
      { day: DayOfWeek.SUNDAY, start: '09:00', end: '21:00' },
    ]},
    { user: 'Tom', days: [
      { day: DayOfWeek.MONDAY, start: '00:00', end: '23:59' },
      { day: DayOfWeek.TUESDAY, start: '00:00', end: '23:59' },
      { day: DayOfWeek.WEDNESDAY, start: '00:00', end: '23:59' },
      { day: DayOfWeek.THURSDAY, start: '00:00', end: '23:59' },
      { day: DayOfWeek.FRIDAY, start: '00:00', end: '23:59' },
      { day: DayOfWeek.SATURDAY, start: '00:00', end: '23:59' },
      { day: DayOfWeek.SUNDAY, start: '00:00', end: '23:59' },
    ]},
    { user: 'Emma', days: [
      { day: DayOfWeek.MONDAY, start: '10:00', end: '18:00' },
      { day: DayOfWeek.TUESDAY, start: '10:00', end: '18:00' },
      { day: DayOfWeek.WEDNESDAY, start: '10:00', end: '18:00' },
    ]},
    { user: 'Chris', days: [
      { day: DayOfWeek.MONDAY, start: '09:00', end: '17:00' },
      { day: DayOfWeek.TUESDAY, start: '09:00', end: '17:00' },
      { day: DayOfWeek.WEDNESDAY, start: '09:00', end: '17:00' },
      { day: DayOfWeek.THURSDAY, start: '09:00', end: '17:00' },
      { day: DayOfWeek.FRIDAY, start: '09:00', end: '17:00' },
    ]},
    { user: 'Dana', days: [
      { day: DayOfWeek.MONDAY, start: '06:00', end: '18:00' },
      { day: DayOfWeek.TUESDAY, start: '06:00', end: '18:00' },
      { day: DayOfWeek.WEDNESDAY, start: '06:00', end: '18:00' },
      { day: DayOfWeek.THURSDAY, start: '06:00', end: '18:00' },
      { day: DayOfWeek.FRIDAY, start: '06:00', end: '18:00' },
    ]},
    { user: 'Frank', days: [
      { day: DayOfWeek.MONDAY, start: '18:00', end: '03:00' },
      { day: DayOfWeek.TUESDAY, start: '18:00', end: '03:00' },
      { day: DayOfWeek.WEDNESDAY, start: '18:00', end: '03:00' },
      { day: DayOfWeek.THURSDAY, start: '18:00', end: '03:00' },
      { day: DayOfWeek.FRIDAY, start: '18:00', end: '03:00' },
      { day: DayOfWeek.SATURDAY, start: '18:00', end: '03:00' },
      { day: DayOfWeek.SUNDAY, start: '18:00', end: '03:00' },
    ]},
    { user: 'Grace', days: [
      { day: DayOfWeek.MONDAY, start: '09:00', end: '17:00' },
      { day: DayOfWeek.TUESDAY, start: '09:00', end: '17:00' },
      { day: DayOfWeek.WEDNESDAY, start: '09:00', end: '17:00' },
      { day: DayOfWeek.THURSDAY, start: '09:00', end: '17:00' },
      { day: DayOfWeek.FRIDAY, start: '09:00', end: '17:00' },
    ]},
    { user: 'Henry', days: [
      { day: DayOfWeek.MONDAY, start: '10:00', end: '22:00' },
      { day: DayOfWeek.TUESDAY, start: '10:00', end: '22:00' },
      { day: DayOfWeek.WEDNESDAY, start: '10:00', end: '22:00' },
      { day: DayOfWeek.THURSDAY, start: '10:00', end: '22:00' },
      { day: DayOfWeek.FRIDAY, start: '10:00', end: '22:00' },
      { day: DayOfWeek.SATURDAY, start: '10:00', end: '22:00' },
      { day: DayOfWeek.SUNDAY, start: '10:00', end: '22:00' },
    ]},
    { user: 'Ivy', days: [
      { day: DayOfWeek.MONDAY, start: '09:00', end: '17:00' },
      { day: DayOfWeek.TUESDAY, start: '09:00', end: '17:00' },
      { day: DayOfWeek.WEDNESDAY, start: '09:00', end: '17:00' },
      { day: DayOfWeek.THURSDAY, start: '09:00', end: '17:00' },
      { day: DayOfWeek.FRIDAY, start: '09:00', end: '17:00' },
    ]},
    { user: 'Jake', days: [
      { day: DayOfWeek.SATURDAY, start: '09:00', end: '21:00' },
      { day: DayOfWeek.SUNDAY, start: '09:00', end: '21:00' },
    ]},
    { user: 'Kate', days: [
      { day: DayOfWeek.MONDAY, start: '05:00', end: '14:00' },
      { day: DayOfWeek.TUESDAY, start: '05:00', end: '14:00' },
      { day: DayOfWeek.WEDNESDAY, start: '05:00', end: '14:00' },
      { day: DayOfWeek.THURSDAY, start: '05:00', end: '14:00' },
      { day: DayOfWeek.FRIDAY, start: '05:00', end: '14:00' },
      { day: DayOfWeek.SATURDAY, start: '05:00', end: '14:00' },
    ]},
    { user: 'Leo', days: [
      { day: DayOfWeek.TUESDAY, start: '16:00', end: '00:00' },
      { day: DayOfWeek.WEDNESDAY, start: '16:00', end: '00:00' },
      { day: DayOfWeek.THURSDAY, start: '16:00', end: '00:00' },
    ]},
  ];

  for (const pattern of availabilityPatterns) {
    const user = getStaff(pattern.user);
    for (const day of pattern.days) {
      await prisma.availability.upsert({
        where: { userId_dayOfWeek: { userId: user.id, dayOfWeek: day.day } },
        update: { startTime: day.start, endTime: day.end },
        create: {
          userId: user.id,
          dayOfWeek: day.day,
          startTime: day.start,
          endTime: day.end,
        },
      });
    }
  }

  console.log('Created availability patterns');

  // Add availability exceptions for Ivy (many exceptions)
  const ivy = getStaff('Ivy');
  const today = new Date();
  const exceptions = [
    { date: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000), isAvailable: false, reason: 'Doctor appointment' },
    { date: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000), isAvailable: false, reason: 'Family event' },
    { date: new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000), isAvailable: true, startTime: '12:00', endTime: '20:00', reason: 'Can work afternoon' },
    { date: new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000), isAvailable: false, reason: 'Vacation day' },
    { date: new Date(today.getTime() + 21 * 24 * 60 * 60 * 1000), isAvailable: false, reason: 'Personal day' },
  ];

  for (const exception of exceptions) {
    const dateOnly = new Date(exception.date.toISOString().split('T')[0]);
    await prisma.availabilityException.upsert({
      where: { userId_date: { userId: ivy.id, date: dateOnly } },
      update: {},
      create: {
        userId: ivy.id,
        date: dateOnly,
        isAvailable: exception.isAvailable,
        startTime: exception.startTime || null,
        endTime: exception.endTime || null,
        reason: exception.reason,
      },
    });
  }

  console.log('Created availability exceptions for Ivy');

  console.log('\n========================================');
  console.log('Seed data created successfully!');
  console.log('========================================');
  console.log('\nTest Accounts:');
  console.log('----------------------------------------');
  console.log('Admin:    admin@coastaleats.com / admin123');
  console.log('Manager:  mike@coastaleats.com / manager123');
  console.log('Manager:  nina@coastaleats.com / manager123');
  console.log('Staff:    sarah@coastaleats.com / staff123');
  console.log('Staff:    tom@coastaleats.com / staff123');
  console.log('Staff:    chris@coastaleats.com / staff123');
  console.log('----------------------------------------\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
