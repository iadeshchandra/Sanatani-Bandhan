const admin = require('firebase-admin');

// Initialize with default credentials
if (admin.apps && admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

const roleMapping = {
  'superadmin': 'SUPER_ADMIN',
  'trustee': 'TRUSTEE',
  'accountant': 'ACCOUNTANT',
  'purohit': 'PUROHIT',
  'volunteer': 'VOLUNTEER',
  'devotee': 'DEVOTEE',
  'manager': 'MANAGER',
  'head_admin': 'SUPER_ADMIN',
  'master_admin': 'SUPER_ADMIN',
  'anonymous': 'ANONYMOUS',
  'admin': 'MANAGER',
  'ADMIN': 'MANAGER'
};

async function fixRoles() {
  console.log('Starting role migration...');
  const usersRef = db.collection('users');
  const snapshot = await usersRef.get();
  
  let count = 0;
  const batch = db.batch();
  
  snapshot.forEach(doc => {
    const data = doc.data();
    let updated = false;
    let updates = {};
    
    // Fix string roles
    if (typeof data.role === 'string' && roleMapping[data.role]) {
      updates.role = roleMapping[data.role];
      updated = true;
    }
    
    // Fix roles map (workspaceId -> role)
    if (data.roles && typeof data.roles === 'object') {
      const newRoles = { ...data.roles };
      let mapUpdated = false;
      for (const [wsId, r] of Object.entries(newRoles)) {
        if (roleMapping[r]) {
          newRoles[wsId] = roleMapping[r];
          mapUpdated = true;
        }
      }
      if (mapUpdated) {
        updates.roles = newRoles;
        updated = true;
      }
    }
    
    if (updated) {
      batch.update(doc.ref, updates);
      count++;
      console.log(`Will update user ${doc.id}: ${JSON.stringify(updates)}`);
    }
  });
  
  if (count > 0) {
    await batch.commit();
    console.log(`Migration complete. Updated ${count} users.`);
  } else {
    console.log('No users needed migration.');
  }
}

fixRoles().catch(console.error);
