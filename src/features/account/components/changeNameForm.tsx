"use client"

import { useQuery } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { getUserQueryOptions } from "@/features/auth/query/getUserQueryOptions"

import { useChangeNameForm } from "../hooks/useChangeNameForm"

export default function ChangeNameForm() {
  const { data: user, isLoading } = useQuery(getUserQueryOptions())

  const form = useChangeNameForm({
    defaultValues: {
      name: user?.name,
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change Name</CardTitle>
        <CardDescription>Update your name</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          id="change-name-form"
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
          className="flex flex-col gap-4"
        >
          <FieldGroup>
            <form.Field
              name="name"
              children={(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Alexander Hammer"
                      aria-invalid={isInvalid}
                    />
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                )
              }}
            />
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter>
        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
          children={([canSubmit, isSubmitting]) => (
            <Button
              form="change-name-form"
              type="submit"
              disabled={!canSubmit || isSubmitting || isLoading}
              className="ml-auto"
            >
              {isSubmitting ? "Changing name..." : "Change name"}
            </Button>
          )}
        />
      </CardFooter>
    </Card>
  )
}
