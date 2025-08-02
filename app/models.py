# users, {id,username,role[default=user],is_admin[default=0],category_id}
#categories {id, name}
#tickets {id,status[default=open],category.id,subject,initial_data,vote[default=0]}
#tickets_replies {id,ticket.id,data,user.id,votes[default=0]}
#messages {id,user.id,data}
