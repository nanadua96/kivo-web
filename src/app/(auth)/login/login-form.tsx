'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { loginAction } from './actions';
import { type LoginInput, loginSchema } from './schema';

export default function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: 'onTouched',
    reValidateMode: 'onChange',
  });

  async function onSubmit(data: LoginInput) {
    console.log(data);
    try {
      const result = await loginAction(data);

      if (!result.success) {
        // Display server-side validation errors
        Object.entries(result.errors).forEach(([field, messages]) => {
          if (messages?.[0]) {
            setError(field as keyof LoginInput, {
              type: 'server',
              message: messages[0],
            });
          }
        });

        return;
      }

      // Successfully triggered OTP
      console.log('OTP sent!');
    } catch (error) {
      console.error('Login failed:', error);
    }
  }

  return (
    <div>
      <h1>Login</h1>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div>
          <input type="email" placeholder="Email" {...register('email')} />
          {errors.email && <p color="red">{errors.email.message}</p>}
        </div>
        <button type="submit" disabled={isSubmitting}>
          Login
        </button>
      </form>
    </div>
  );
}

// 'use client';

// import { zodResolver } from '@hookform/resolvers/zod';
// import { useForm } from 'react-hook-form';
// import { loginAction } from './actions';
// import { type LoginInput, loginSchema } from './schema';

// export default function LoginForm() {
//   const {
//     register,
//     handleSubmit,
//     formState: { errors, isSubmitting },
//   } = useForm<LoginInput>({
//     resolver: zodResolver(loginSchema),
//     mode: 'onTouched',
//     reValidateMode: 'onChange',
//   });

//   async function onSubmit(data: LoginInput) {
//     console.log(data);
//     try {
//       const result = await loginAction(data);

//       if (!result.success) {
//         // Display server-side validation errors
//         Object.entries(result.errors).forEach(([field, messages]) => {
//           if (messages?.[0]) {
//             setError(field as keyof LoginInput, {
//               type: 'server',
//               message: messages[0],
//             });
//           }
//         });

//         return;
//       }

//       // Successfully triggered OTP
//       console.log('OTP sent!');
//     } catch (error) {
//       console.error('Login failed:', error);
//     }
//   }

//   return (
//     <div>
//       <h1>Login</h1>

//       <form onSubmit={handleSubmit(onSubmit)}>
//         <div>
//           <input type="email" placeholder="Email" {...register('email')} />
//           {errors.email && <p color="red">{errors.email.message}</p>}
//         </div>
//         <button type="submit" disabled={isSubmitting}>
//           Login
//         </button>
//       </form>
//     </div>
//   );
// }
