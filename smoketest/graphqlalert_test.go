package smoketest

import (
	"encoding/json"
	"fmt"
	"github.com/target/goalert/smoketest/harness"
	"testing"
	"time"
)

// TestGraphQLAlert tests that all steps up to, and including, generating
// an alert via GraphQL result in notifications going out.
//
// Specifically, mutations tested include:
// - createContactMethod
// - createNotificationRule
// - createSchedule
// - updateSchedule
// - addRotationParticipant
// - createOrUpdateEscalationPolicy
// - createOrUpdateEscalationPolicyStep
// - createService
// - createAlert
func TestGraphQLAlert(t *testing.T) {
	t.Parallel()

	const sql = `
	insert into users (id, name, email)
	values
		({{uuid "u1"}}, 'bob', 'joe'),
		({{uuid "u2"}}, 'ben', 'josh');
`
	loc, err := time.LoadLocation("America/Chicago")
	if err != nil {
		t.Fatal("failed to load America/Chicago tzdata:", err)
	}

	h := harness.NewHarness(t, sql, "ids-to-uuids")
	defer h.Close()

	doQL := func(query string, res interface{}) {
		g := h.GraphQLQuery(query)
		for _, err := range g.Errors {
			t.Error("GraphQL Error:", err.Message)
		}
		if len(g.Errors) > 0 {
			t.Fatal("errors returned from GraphQL")
		}
		t.Log("Response:", string(g.Data))
		if res == nil {
			return
		}
		err := json.Unmarshal(g.Data, &res)
		if err != nil {
			t.Fatal("failed to parse response:", err)
		}
	}

	uid1, uid2 := h.UUID("u1"), h.UUID("u2")
	phone1, phone2 := h.Phone("u1"), h.Phone("u2")

	var cm1, cm2 struct{ CreateContactMethod struct{ ID string } }
	doQL(fmt.Sprintf(`
		mutation {
			createContactMethod(input:{
				user_id: "%s",
				name: "default",
				type: SMS,
				value: "%s"
			}) {
				id
			}
		}
	`, uid1, phone1), &cm1)
	doQL(fmt.Sprintf(`
		mutation {
			createContactMethod(input:{
				user_id: "%s",
				name: "default",
				type: SMS,
				value: "%s"
			}) {
				id
			}
		}
	`, uid2, phone2), &cm2)

	doQL(fmt.Sprintf(`
		mutation {
			createNotificationRule(input:{
				user_id: "%s"
				contact_method_id: "%s",
				delay_minutes: 0
			}){
				id
			}
		}
	
	`, uid1, cm1.CreateContactMethod.ID), nil)

	doQL(fmt.Sprintf(`
		mutation {
			createNotificationRule(input:{
				user_id: "%s"
				contact_method_id: "%s",
				delay_minutes: 0
			}){
				id
			}
		}
	
	`, uid2, cm2.CreateContactMethod.ID), nil)

	var sched struct {
		CreateSchedule struct {
			ID        string
			Rotations []struct{ ID string }
		}
	}

	doQL(fmt.Sprintf(`
		mutation {
			createSchedule(input:{
				name: "default",
				description: "default testing",
				time_zone: "America/Chicago",
				default_rotation: {
					type: daily,
					start_time: "%s",
    				shift_length:1,
  				}
			}){
				id
				rotations {
					id
				}
			}
		}
	
	`, time.Now().Add(-time.Hour).In(loc).Format(time.RFC3339)), &sched)

	if len(sched.CreateSchedule.Rotations) != 1 {
		t.Fatal("createSchedule did not create (or did not return) default rotation")
	}
	rotID := sched.CreateSchedule.Rotations[0].ID

	doQL(fmt.Sprintf(`
		mutation {
			addRotationParticipant(input:{
				user_id: "%s",
				rotation_id: "%s"
			}) {id}
		}
	
	`, uid1, rotID), nil)

	var esc struct{ CreateOrUpdateEscalationPolicy struct{ ID string } }
	doQL(`
		mutation {
			createOrUpdateEscalationPolicy(input:{
				repeat: 0,
				name: "default"
			}){id}
		}
	`, &esc)

	var step struct {
		CreateOrUpdateEscalationPolicyStep struct{ Step struct{ ID string } }
	}
	doQL(fmt.Sprintf(`
		mutation {
			createOrUpdateEscalationPolicyStep(input:{
				delay_minutes: 60,
				escalation_policy_id: "%s",
				user_ids: ["%s"],
				schedule_ids: ["%s"]
			}){
				step: escalation_policy_step {id}
			}
		}
	`, esc.CreateOrUpdateEscalationPolicy.ID, uid2, sched.CreateSchedule.ID), &step)
	var svc struct{ CreateService struct{ ID string } }
	doQL(fmt.Sprintf(`
		mutation {
			createService(input:{
				name: "default",
				escalation_policy_id: "%s"
			}){id}
		}
	`, esc.CreateOrUpdateEscalationPolicy.ID), &svc)

	// finally.. we can create the alert
	doQL(fmt.Sprintf(`
		mutation {
			createAlert(input:{
				description: "brok",
				service_id: "%s"
			}){id}
		}
	`, svc.CreateService.ID), nil)

	h.Twilio().Device(phone1).ExpectSMS()
	h.Twilio().Device(phone2).ExpectSMS()
}
