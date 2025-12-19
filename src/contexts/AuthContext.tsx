import { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  AuthError as FirebaseAuthError
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { supabase } from '../lib/supabase';
import type { UserRole, Doctor, Patient } from '../types/database';

// Compatible User interface (maps Firebase user to expected shape)
interface User {
  id: string;
  email: string | null;
  email_confirmed_at?: string | null;
}

// Compatible Session interface
interface Session {
  access_token: string;
  user: User;
}

// Error interface for compatibility
interface AuthError {
  message: string;
  code?: string;
}

// Profile data for signup
interface DoctorSignupData {
  name: string;
  specialty?: string;
  clinic_name?: string;
}

interface PatientSignupData {
  name: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  isDoctor: boolean;
  isPatient: boolean;
  userRole: UserRole | null;
  doctorProfile: Doctor | null;
  patientProfile: Patient | null;
  signIn: (email: string, password: string, role?: 'doctor' | 'patient') => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, role?: 'doctor' | 'patient', profileData?: DoctorSignupData | PatientSignupData) => Promise<{ error: AuthError | null; session: Session | null }>;
  signInWithGoogle: (role?: 'doctor' | 'patient', profileData?: DoctorSignupData | PatientSignupData) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  refreshProfiles: () => Promise<void>;
  refreshDoctorProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Map Firebase error codes to user-friendly messages
function mapFirebaseError(error: FirebaseAuthError): AuthError {
  const errorMessages: Record<string, string> = {
    'auth/email-already-in-use': 'An account with this email already exists',
    'auth/invalid-email': 'Please enter a valid email address',
    'auth/operation-not-allowed': 'This sign-in method is not enabled',
    'auth/weak-password': 'Password must be at least 6 characters',
    'auth/user-disabled': 'This account has been disabled',
    'auth/user-not-found': 'No account found with this email',
    'auth/wrong-password': 'Incorrect password',
    'auth/invalid-credential': 'Invalid email or password',
    'auth/too-many-requests': 'Too many attempts. Please try again later',
    'auth/popup-closed-by-user': 'Sign-in was cancelled',
    'auth/popup-blocked': 'Popup was blocked. Please allow popups for this site',
    'auth/network-request-failed': 'Network error. Please check your connection',
  };

  return {
    message: errorMessages[error.code] || error.message || 'An error occurred',
    code: error.code
  };
}

// Map Firebase user to compatible User interface
function mapFirebaseUser(firebaseUser: FirebaseUser): User {
  return {
    id: firebaseUser.uid,
    email: firebaseUser.email,
    email_confirmed_at: firebaseUser.emailVerified ? new Date().toISOString() : null
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDoctor, setIsDoctor] = useState(false);
  const [isPatient, setIsPatient] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [doctorProfile, setDoctorProfile] = useState<Doctor | null>(null);
  const [patientProfile, setPatientProfile] = useState<Patient | null>(null);

  // Debug: Log when doctorProfile changes
  useEffect(() => {
    console.log('🔔 doctorProfile state changed:', doctorProfile ? { id: doctorProfile.id, name: doctorProfile.name } : null);
  }, [doctorProfile]);

  // Function to load doctor profile
  const loadDoctorProfile = async (userId: string): Promise<Doctor | null> => {
    console.log('🔍 loadDoctorProfile called with userId:', userId);
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.log('ℹ️ No doctor profile found for userId:', userId, 'error:', error);
        return null;
      }
      console.log('✅ Doctor profile loaded:', { id: data.id, name: data.name, user_id: data.user_id });
      return data as Doctor;
    } catch (err) {
      console.error('❌ Error loading doctor profile:', err);
      return null;
    }
  };

  // Function to load patient profile (via user_id in patients table)
  const loadPatientProfile = async (userId: string): Promise<Patient | null> => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.log('ℹ️ No patient profile found');
        return null;
      }
      return data as Patient;
    } catch (err) {
      console.error('❌ Error loading patient profile:', err);
      return null;
    }
  };

  // Function to refresh profiles (can be called after profile updates)
  const refreshProfiles = async () => {
    if (!user) return;

    if (userRole === 'doctor') {
      const doctor = await loadDoctorProfile(user.id);
      setDoctorProfile(doctor);
    } else if (userRole === 'patient') {
      const patient = await loadPatientProfile(user.id);
      setPatientProfile(patient);
    }
  };

  // Function to specifically refresh doctor profile
  const refreshDoctorProfile = async () => {
    console.log('🔄 refreshDoctorProfile called, user:', user?.id);
    if (!user) return;
    const doctor = await loadDoctorProfile(user.id);
    console.log('📝 Refreshing doctorProfile to:', doctor ? { id: doctor.id, name: doctor.name } : null);
    setDoctorProfile(doctor);
  };

  useEffect(() => {
    const sessionStart = performance.now();

    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      const sessionEnd = performance.now();
      console.log(`⏱️ Auth state check: ${(sessionEnd - sessionStart).toFixed(0)}ms`);

      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          const mappedUser = mapFirebaseUser(firebaseUser);

          setUser(mappedUser);
          setSession({
            access_token: token,
            user: mappedUser
          });

          // Check user role
          try {
            const { data: roleData, error: roleError } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', firebaseUser.uid)
              .single();

            if (!roleError && roleData) {
              const role = roleData.role as UserRole;
              setUserRole(role);
              setIsAdmin(role === 'admin' || role === 'superadmin');
              setIsDoctor(role === 'doctor');
              setIsPatient(role === 'patient');
              console.log('👑 User role:', role);

              // Load appropriate profile based on role
              if (role === 'doctor') {
                console.log('🔄 Loading doctor profile for role: doctor');
                const doctor = await loadDoctorProfile(firebaseUser.uid);
                console.log('📝 Setting doctorProfile to:', doctor ? { id: doctor.id, name: doctor.name } : null);
                setDoctorProfile(doctor);
                setPatientProfile(null);
              } else if (role === 'patient') {
                const patient = await loadPatientProfile(firebaseUser.uid);
                setPatientProfile(patient);
                setDoctorProfile(null);
              } else {
                // Admin or other roles - they might also be doctors
                const doctor = await loadDoctorProfile(firebaseUser.uid);
                if (doctor) {
                  console.log('📝 Setting doctorProfile for admin/other role to:', { id: doctor.id, name: doctor.name });
                  setDoctorProfile(doctor);
                  setIsDoctor(true);
                }
                setPatientProfile(null);
              }
            } else {
              // No role found - default to 'user' (legacy behavior)
              setUserRole('user');
              setIsAdmin(false);
              setIsDoctor(false);
              setIsPatient(false);
              setDoctorProfile(null);
              setPatientProfile(null);
            }
          } catch (roleErr) {
            console.log('ℹ️ No role found for user');
            setUserRole('user');
            setIsAdmin(false);
            setIsDoctor(false);
            setIsPatient(false);
            setDoctorProfile(null);
            setPatientProfile(null);
          }

          console.log('✅ User authenticated:', firebaseUser.email);
          console.log('📧 Email verified:', firebaseUser.emailVerified);
        } catch (err) {
          console.error('❌ Error getting auth token:', err);
          setUser(null);
          setSession(null);
          setIsAdmin(false);
          setIsDoctor(false);
          setIsPatient(false);
          setUserRole(null);
          setDoctorProfile(null);
          setPatientProfile(null);
        }
      } else {
        setUser(null);
        setSession(null);
        setIsAdmin(false);
        setIsDoctor(false);
        setIsPatient(false);
        setUserRole(null);
        setDoctorProfile(null);
        setPatientProfile(null);
        console.log('👤 No user signed in');
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string, role?: 'doctor' | 'patient') => {
    const signInStart = performance.now();

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const signInEnd = performance.now();

      // Check if email is verified (optional - you can remove this check if not needed)
      if (!result.user.emailVerified) {
        console.log('⚠️ Email not verified, but allowing sign-in');
        // You can optionally block unverified users here:
        // return { error: { message: 'Please verify your email before signing in' } };
      }

      // If a role is specified, validate and ensure the user has the appropriate records
      if (role) {
        try {
          // Check if user_roles entry exists
          const { data: existingRole } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', result.user.uid)
            .single();

          if (existingRole) {
            // Validate that user's role matches the portal they're trying to access
            const userRole = existingRole.role as string;

            if (role === 'doctor' && userRole === 'patient') {
              // Patient trying to log in via doctor portal
              console.log('❌ Patient account cannot log in via doctor portal');
              await firebaseSignOut(auth);
              return {
                error: {
                  message: 'This account is registered as a patient. Please use the Patient Portal to sign in.',
                  code: 'wrong-portal'
                }
              };
            }

            if (role === 'patient' && (userRole === 'doctor' || userRole === 'admin' || userRole === 'superadmin')) {
              // Doctor/admin trying to log in via patient portal
              console.log('❌ Doctor/admin account cannot log in via patient portal');
              await firebaseSignOut(auth);
              return {
                error: {
                  message: 'This account is registered as a doctor. Please use the Doctor Portal to sign in.',
                  code: 'wrong-portal'
                }
              };
            }

            console.log('✅ User role validated:', userRole);
          } else {
            // No existing role - create user_roles entry
            const { error: roleError } = await supabase
              .from('user_roles')
              .insert({
                user_id: result.user.uid,
                email: result.user.email,
                role: role
              });

            if (roleError) {
              console.error('❌ Error creating user role on sign-in:', roleError);
            } else {
              console.log('✅ User role created on sign-in:', role);
            }
          }

          // If signing in as doctor, ensure doctor profile exists
          if (role === 'doctor') {
            const { data: existingDoctor } = await supabase
              .from('doctors')
              .select('id')
              .eq('user_id', result.user.uid)
              .single();

            if (!existingDoctor) {
              // Create doctor profile
              const { error: doctorError } = await supabase
                .from('doctors')
                .insert({
                  user_id: result.user.uid,
                  email: result.user.email,
                  name: result.user.displayName || result.user.email?.split('@')[0] || 'Doctor'
                });

              if (doctorError) {
                console.error('❌ Error creating doctor profile on sign-in:', doctorError);
              } else {
                console.log('✅ Doctor profile created on sign-in');
              }
            }
          }
        } catch (profileErr) {
          console.error('❌ Error setting up user profile on sign-in:', profileErr);
        }
      }

      console.log(`⏱️ Sign in: ${(signInEnd - signInStart).toFixed(0)}ms ✅ Success`);
      return { error: null };
    } catch (err) {
      const signInEnd = performance.now();
      const firebaseError = err as FirebaseAuthError;
      console.log(`⏱️ Sign in: ${(signInEnd - signInStart).toFixed(0)}ms ❌ Failed: ${firebaseError.code}`);
      return { error: mapFirebaseError(firebaseError) };
    }
  };

  const signUp = async (email: string, password: string, role?: 'doctor' | 'patient', profileData?: DoctorSignupData | PatientSignupData) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);

      // Send email verification
      try {
        await sendEmailVerification(result.user);
        console.log('✅ Verification email sent to:', email);
      } catch (verifyErr) {
        console.warn('⚠️ Could not send verification email:', verifyErr);
      }

      // Create user_role entry if role is specified
      if (role) {
        try {
          const { error: roleError } = await supabase
            .from('user_roles')
            .insert({
              user_id: result.user.uid,
              email: email,
              role: role
            });

          if (roleError) {
            console.error('❌ Error creating user role:', roleError);
          } else {
            console.log('✅ User role created:', role);
          }

          // Create profile based on role
          if (role === 'doctor') {
            const doctorData = profileData as DoctorSignupData | undefined;
            const { error: doctorError } = await supabase
              .from('doctors')
              .insert({
                user_id: result.user.uid,
                email: email,
                name: doctorData?.name || email.split('@')[0],
                specialty: doctorData?.specialty || null,
                clinic_name: doctorData?.clinic_name || null
              });

            if (doctorError) {
              console.error('❌ Error creating doctor profile:', doctorError);
            } else {
              console.log('✅ Doctor profile created');
            }
          } else if (role === 'patient') {
            const patientData = profileData as PatientSignupData | undefined;

            // Check if a patient record with this email already exists (created by a doctor)
            const { data: existingPatient } = await supabase
              .from('patients')
              .select('id, created_by')
              .eq('email', email)
              .is('user_id', null) // Only match records not yet linked to a user
              .single();

            if (existingPatient) {
              // Link the existing patient record to this user
              console.log('🔗 Found existing patient record, linking to user account');
              const { error: linkError } = await supabase
                .from('patients')
                .update({ user_id: result.user.uid })
                .eq('id', existingPatient.id);

              if (linkError) {
                console.error('❌ Error linking patient to existing record:', linkError);
              } else {
                console.log('✅ Patient linked to existing record');

                // Create patient_doctor relationship with the doctor who created them
                if (existingPatient.created_by && existingPatient.created_by !== result.user.uid) {
                  // Find the doctor profile for the creator
                  const { data: doctorProfile } = await supabase
                    .from('doctors')
                    .select('id')
                    .eq('user_id', existingPatient.created_by)
                    .single();

                  if (doctorProfile) {
                    const { error: relationshipError } = await supabase
                      .from('patient_doctor')
                      .insert({
                        patient_id: existingPatient.id,
                        doctor_id: doctorProfile.id,
                        initiated_by: 'doctor',
                        status: 'active'
                      });

                    if (relationshipError) {
                      // Might already exist, that's ok
                      console.warn('⚠️ Could not create patient-doctor relationship:', relationshipError.message);
                    } else {
                      console.log('✅ Patient-doctor relationship created');
                    }
                  }
                }
              }
            } else {
              // No existing record, create a new patient
              const { error: patientError } = await supabase
                .from('patients')
                .insert({
                  user_id: result.user.uid,
                  email: email,
                  name: patientData?.name || email.split('@')[0],
                  sex: 'Other', // Default, can be updated
                  date_of_birth: '2000-01-01', // Default, must be updated
                  consultation_language: 'en-IN',
                  created_by: result.user.uid
                });

              if (patientError) {
                console.error('❌ Error creating patient profile:', patientError);
              } else {
                console.log('✅ Patient profile created');
              }
            }
          }
        } catch (profileErr) {
          console.error('❌ Error setting up user profile:', profileErr);
        }
      }

      // User is automatically signed in after registration
      const token = await result.user.getIdToken();
      const mappedUser = mapFirebaseUser(result.user);

      const newSession: Session = {
        access_token: token,
        user: mappedUser
      };

      console.log('✅ Signup successful - auto-logged in');
      return { error: null, session: newSession };
    } catch (err) {
      const firebaseError = err as FirebaseAuthError;
      console.error('❌ Signup error:', firebaseError.code, firebaseError.message);
      return { error: mapFirebaseError(firebaseError), session: null };
    }
  };

  const signInWithGoogle = async (role?: 'doctor' | 'patient', profileData?: DoctorSignupData | PatientSignupData) => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      console.log('✅ Google sign-in successful:', result.user.email);

      // If a role is specified, ensure user has appropriate records
      if (role) {
        const { data: existingRole } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', result.user.uid)
          .single();

        // If user has existing role, validate it matches the portal
        if (existingRole) {
          const userRole = existingRole.role as string;

          if (role === 'doctor' && userRole === 'patient') {
            // Patient trying to log in via doctor portal
            console.log('❌ Patient account cannot log in via doctor portal');
            await firebaseSignOut(auth);
            return {
              error: {
                message: 'This account is registered as a patient. Please use the Patient Portal to sign in.',
                code: 'wrong-portal'
              }
            };
          }

          if (role === 'patient' && (userRole === 'doctor' || userRole === 'admin' || userRole === 'superadmin')) {
            // Doctor/admin trying to log in via patient portal
            console.log('❌ Doctor/admin account cannot log in via patient portal');
            await firebaseSignOut(auth);
            return {
              error: {
                message: 'This account is registered as a doctor. Please use the Doctor Portal to sign in.',
                code: 'wrong-portal'
              }
            };
          }

          console.log('✅ User role validated:', userRole);
        }

        // If no existing role, create one
        if (!existingRole) {
          try {
            const { error: roleError } = await supabase
              .from('user_roles')
              .insert({
                user_id: result.user.uid,
                email: result.user.email,
                role: role
              });

            if (roleError) {
              console.error('❌ Error creating user role:', roleError);
            } else {
              console.log('✅ User role created:', role);
            }
          } catch (roleErr) {
            console.error('❌ Error creating user role:', roleErr);
          }
        }

        // Always check and create doctor profile if signing in as doctor (regardless of existing role)
        if (role === 'doctor') {
          const { data: existingDoctor } = await supabase
            .from('doctors')
            .select('id')
            .eq('user_id', result.user.uid)
            .single();

          if (!existingDoctor) {
            const doctorData = profileData as DoctorSignupData | undefined;
            const { error: doctorError } = await supabase
              .from('doctors')
              .insert({
                user_id: result.user.uid,
                email: result.user.email,
                name: doctorData?.name || result.user.displayName || result.user.email?.split('@')[0] || 'Doctor',
                specialty: doctorData?.specialty || null,
                clinic_name: doctorData?.clinic_name || null
              });

            if (doctorError) {
              console.error('❌ Error creating doctor profile:', doctorError);
            } else {
              console.log('✅ Doctor profile created on Google sign-in');
            }
          }
        } else if (role === 'patient' && !existingRole) {
          // Only create patient profile if no existing role (new user)
          const patientData = profileData as PatientSignupData | undefined;
          const userEmail = result.user.email;

          // Check if a patient record with this email already exists (created by a doctor)
          const { data: existingPatient } = await supabase
            .from('patients')
            .select('id, created_by')
            .eq('email', userEmail)
            .is('user_id', null) // Only match records not yet linked to a user
            .single();

          if (existingPatient) {
            // Link the existing patient record to this user
            console.log('🔗 Found existing patient record, linking to user account');
            const { error: linkError } = await supabase
              .from('patients')
              .update({ user_id: result.user.uid })
              .eq('id', existingPatient.id);

            if (linkError) {
              console.error('❌ Error linking patient to existing record:', linkError);
            } else {
              console.log('✅ Patient linked to existing record');

              // Create patient_doctor relationship with the doctor who created them
              if (existingPatient.created_by && existingPatient.created_by !== result.user.uid) {
                // Find the doctor profile for the creator
                const { data: doctorProfile } = await supabase
                  .from('doctors')
                  .select('id')
                  .eq('user_id', existingPatient.created_by)
                  .single();

                if (doctorProfile) {
                  const { error: relationshipError } = await supabase
                    .from('patient_doctor')
                    .insert({
                      patient_id: existingPatient.id,
                      doctor_id: doctorProfile.id,
                      initiated_by: 'doctor',
                      status: 'active'
                    });

                  if (relationshipError) {
                    // Might already exist, that's ok
                    console.warn('⚠️ Could not create patient-doctor relationship:', relationshipError.message);
                  } else {
                    console.log('✅ Patient-doctor relationship created');
                  }
                }
              }
            }
          } else {
            // No existing record, create a new patient
            const { error: patientError } = await supabase
              .from('patients')
              .insert({
                user_id: result.user.uid,
                email: result.user.email,
                name: patientData?.name || result.user.displayName || result.user.email?.split('@')[0] || 'Patient',
                sex: 'Other',
                date_of_birth: '2000-01-01',
                consultation_language: 'en-IN',
                created_by: result.user.uid
              });

            if (patientError) {
              console.error('❌ Error creating patient profile:', patientError);
            } else {
              console.log('✅ Patient profile created');
            }
          }
        }
      }

      return { error: null };
    } catch (err) {
      const firebaseError = err as FirebaseAuthError;

      // Don't show error if user just closed the popup
      if (firebaseError.code === 'auth/popup-closed-by-user') {
        console.log('ℹ️ Google sign-in cancelled by user');
        return { error: null };
      }

      console.error('❌ Google sign-in error:', firebaseError.code, firebaseError.message);
      return { error: mapFirebaseError(firebaseError) };
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      console.log('✅ Signed out successfully');
    } catch (err) {
      console.error('❌ Sign out error:', err);
    }
  };

  // Get current ID token (for API calls)
  const getIdToken = async (): Promise<string | null> => {
    const currentUser = auth.currentUser;
    if (!currentUser) return null;

    try {
      return await currentUser.getIdToken();
    } catch (err) {
      console.error('❌ Error getting ID token:', err);
      return null;
    }
  };

  // Send password reset email (Firebase will send via custom SMTP - Resend)
  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      console.log('✅ Password reset email sent to:', email);
      return { error: null };
    } catch (err) {
      const firebaseError = err as FirebaseAuthError;
      console.error('❌ Password reset error:', firebaseError.code, firebaseError.message);
      return { error: mapFirebaseError(firebaseError) };
    }
  };

  const value = {
    user,
    session,
    loading,
    isAdmin,
    isDoctor,
    isPatient,
    userRole,
    doctorProfile,
    patientProfile,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    getIdToken,
    resetPassword,
    refreshProfiles,
    refreshDoctorProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
